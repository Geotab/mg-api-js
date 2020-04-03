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
        '--disable-web-security'
      ]
};

let authenticationAttempts = 0;
module.exports = async function(){
    browser = await puppeteer.launch(opts);
    page = await browser.newPage();
    // Allowing puppeteer access to the request - needed for mocks
    await page.setRequestInterception(true);

    // Setup mocks
    await page.on('request', request => {
        if (request.url().includes(`https://${mocks.server}/apiv1`)) {
            // Post requests are normal xhr/call methods
            let payload = '';
            if(request.method() === 'POST'){
                let body = parseRequest(request.postData());
                switch (body.method) {
                    case 'Authenticate':
                        // Alternate the credential response to test forget()
                        if(authenticationAttempts%2===0){
                            payload = { result: mocks.credentials};
                            authenticationAttempts++;
                        } else {
                            payload = { result: mocks.refreshedCredentials};
                            authenticationAttempts++;
                        }
                        break;
                    case 'Get':
                        switch (body.params.typeName) {
                            case 'Device':
                                payload = { result: [mocks.device]};
                                break;
                            case 'User':
                                payload = { result: [mocks.user]};
                                break;
                        }
                        break;
                    case 'Geet':
                        // Poorly formed request tests
                        payload = { result: {
                            name: "InvalidCall",
                            message: "Bad info entered"
                        }}
                        break;
                    case 'ExecuteMultiCall':
                        // Looping each of the calls
                        body.params.calls.forEach( call => {
                            switch(call.method){
                                case 'GetCountOf':
                                    // Stripped down to basics for ease of testing
                                    payload = {result: [2000, 2001]};
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
        } else if(request.url().includes('badinfo')){
            payload = {
                error: {
                    name: "InvalidUserException",
                    message: "Bad info entered"
                }
            }

            request.respond({
                content: 'application/json',
                headers: { 'Access-Control-Allow-Origin': '*'},
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