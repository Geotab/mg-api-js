const puppeteer = require('puppeteer');
const mocks = require('../mocks/mocks.js');

// puppeteer options
const opts = {
    devtools: true, // Opens browser dev tools when headless is false
    headless: false, // puppeteer can't parse application/json WITHOUT a browser open - Results in OPTIONS call instead of POST
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
                let body = JSON.parse(request.postData());
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
    await page.goto('http://127.0.0.1:9000/test/web/');
    // es6 destructuring
    return [browser, page];
}