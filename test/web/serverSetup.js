const puppeteer = require('puppeteer');
const mocks = require('../mocks/mocks.js');

// JSON-RPC helpers
const parseRequest = body => {
    return JSON.parse(body);
};

// puppeteer options
const opts = {
    devtools: true, // Opens browser dev tools when headless is false
    headless: true,
    slowMo: 0,
    timeout: 10000,
    args: [
        // Something about headless mode makes the application/json call trip off a CORS request.
        // A headed browser may convert all content-types to one of the allowed values
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Examples_of_access_control_scenarios
        // Configuring the request to respond to the preflight OPTIONS should also have worked, but this
        // workaround is far easier and faster
        '--disable-web-security',
        // Using sandbox triggers this error when calling browser.newPage(): 
        // [0809/104946.906735:FATAL:gpu_data_manager_impl_private.cc(1034)] The display compositor is frequently crashing. Goodbye.
        // This causes the call to hang and block the tests from running.
        // Disabling sandbox in a testing context shouldn't cause any security concerns
        '--no-sandbox'
    ]
};

let authenticationAttempts = 0;
module.exports = async function () {
    browser = await puppeteer.launch(opts);
    page = await browser.newPage();
    // Allowing puppeteer access to the request - needed for mocks
    await page.setRequestInterception(true);

    // Setup mocks
    await page.on('request', request => {
        if (request.url().includes(`https://${mocks.server}/apiv1`)) {
            // Post requests are normal xhr/call methods
            let payload = '';
            if (request.method() === 'POST') {
                let body = parseRequest(request.postData());
                switch (body.method) {
                    case 'Authenticate':
                        // Alternate the credential response to test forget()
                        if (authenticationAttempts % 2 === 0) {
                            payload = { result: mocks.credentials };
                            authenticationAttempts++;
                        } else {
                            payload = { result: mocks.refreshedCredentials };
                            authenticationAttempts++;
                        }
                        break;
                    case 'Get':
                        switch (body.params.typeName) {
                            case 'Device':
                                payload = { result: [mocks.device] };
                                break;
                            case 'User':
                                payload = { result: [mocks.user] };
                                break;
                        }
                        break;
                    case 'Geet':
                        // Poorly formed request tests
                        payload = {
                            error: {
                                code: -32000,
                                name: "JSONRPCError",
                                message: "The method 'Geet' could not be found. Verify the method name and ensure all method parameters are included.",
                                data: {
                                    type: "MissingMethodException",
                                    id: "ee15868e-6d47-41de-bafc-b20c1ca95152",
                                    requestIndex: 0
                                }
                            }
                        }
                        break;
                    case 'ExecuteMultiCall':
                        // Looping each of the calls
                        body.params.calls.forEach(call => {
                            switch (call.method) {
                                case 'GetCountOf':
                                    // Stripped down to basics for ease of testing
                                    payload = { result: [2000, 2001] };
                                    break;
                            }
                        })
                        break;
                }
                request.respond({
                    content: 'application/json',
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify(payload)
                });
            }
        } else if (request.url().includes('badinfo')) {
            payload = {
                error: {
                    code: -32000,
                    name: "JSONRPCError",
                    message: "Incorrect login credentials",
                    data: {
                        type: "InvalidUserException",
                        id: "0b508b9e-7b94-4d38-b72f-8629119f73a3",
                        requestIndex: 0
                    }
                }
            }

            request.respond({
                content: 'application/json',
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify(payload)
            });
        } else {
            request.continue();
        }
    });
    await page.goto('http://localhost:9000/test/web/');
    // es6 destructuring
    return [browser, page];
}