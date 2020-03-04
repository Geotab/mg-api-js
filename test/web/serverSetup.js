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
            } else {
                // Request looks something like...
                // https://www.myaddin.com/apiv1/Authenticate?JSONP=geotabJSONP.json14328697799013979&database=%22testDB%22&userName=%22testUser%40test.com%22&password=%22...%22
                let url = request.url();
                let splitUrl = url.split('?');
                let method = splitUrl[0];
                // callback matches window scope function passed in by user
                let callback = splitUrl[1].match(/geotabJSONP\.json[\d]+/)[0];
                let params = splitUrl[1].split(/geotabJSONP\.json[\d]+/)[1];
                let cred = mocks.credentials.credentials;
                // JSONP expects executeable javascript to be returned
                let response = `${callback}({"result": {"credentials":{`;

                let len = cred.len;
                let keys = Object.keys(cred);
                // Last item (server) in credentials is outside of credentials in response, hence i<len-1
                for(let i=0; i<len-1; i++){
                    response += `"${key[i]}":"${cred[keys[i]]}",`;
                }
                response += `}, server: ${cred[keys[len-1]]}},"jsonrpc":"2.0"})`;
                // response has to be text/javascript so the browser can execute it
                request.respond({
                    contentType: 'text/javascript; charset=utf-8',
                    headers: { 'Access-Control-Allow-Origin': '*'},
                    body: response
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
                body: JSON.stringify(rpcResponse(payload))
            });
        } else {
            request.continue();
        }
    });
    await page.goto('http://127.0.0.1:9000/test/web/');
    // es6 destructuring
    return [browser, page];
}