const puppeteer = require('puppeteer');
const mocks = require('../mocks/mocks.js');

// JSON-RPC helpers
const rpcRequest = body => {
    let decodedBody = decodeURIComponent(body);
    let json = decodedBody.replace('JSON-RPC=', '');
    return JSON.parse(json);
};

const rpcResponse = (response, err) => {
    return {
        id: -1,
        result: response,
        error: err
    };
};

// puppeteer options
const opts = {
    devtools: true, // Opens browser dev tools when headless is false
    headless: true,
    slowMo: 0,
    timeout: 10000
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
                let rpcBody = rpcRequest(request.postData());
                switch (rpcBody.method) {
                    case 'Authenticate':
                        // Alternate the credential response to test forget()
                        if(authenticationAttempts%2===0){
                            payload = mocks.credentials;
                            authenticationAttempts++;
                        } else {
                            payload = mocks.refreshedCredentials;
                            authenticationAttempts++;
                        }
                        break;
                    case 'Get':
                        switch (rpcBody.params.typeName) {
                            case 'Device':
                                payload = [mocks.device];
                                break;
                            case 'User':
                                payload = [mocks.user];
                                break;
                        }
                        break;
                    case 'Geet':
                        // Poorly formed request tests
                        payload = {
                            name: "InvalidCall",
                            message: "Bad info entered"
                        }
                        break;
                    case 'ExecuteMultiCall':
                        // Looping each of the calls
                        rpcBody.params.calls.forEach( call => {
                            switch(call.method){
                                case 'GetCountOf':
                                    // Stripped down to basics for ease of testing
                                    payload = [2000, 2001];
                                break;
                            }
                        })
                        break;
                    }
                request.respond({
                    content: 'application/json',
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify(rpcResponse(payload))
                }); 
            } 
        } else if(request.url().includes('badinfo')){
            payload = {
                name: "InvalidUserException",
                message: "Bad info entered"
            }

            request.respond({
                content: 'application/json',
                headers: { 'Access-Control-Allow-Origin': '*'},
                body: JSON.stringify(rpcResponse(undefined, payload))
            });
        } else {
            request.continue();
        }
    });
    await page.goto('http://127.0.0.1:9000/test/web/');
    // es6 destructuring
    return [browser, page];
}