const puppeteer = require('puppeteer');
const assert = require('chai').assert;
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
    devtools: true, // Opens browser dev tools
    headless: false,
    slowMo: 0,
    timeout: 10000
};


describe('User opens webpage', () => {
    let browser,
        page,
        api; // Scoping API for use in all calls

    
    before(async () => {
        browser = await puppeteer.launch(opts);
        page = await browser.newPage();
        // Allowing puppeteer access to the request - needed for mocks
        await page.setRequestInterception(true);

        // Setup mocks
        await page.on('request', request => {
            if (request.url().includes(`https://${mocks.server}/apiv1`)) {
                let rpcBody = rpcRequest(request.postData());
                let payload = '';
                switch (rpcBody.method) {
                    case 'Authenticate':
                        payload = mocks.credentials;
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
                                    switch (call.params.typeName) {
                                        case 'User':
                                            payload = [1000];
                                            break;
                                        case 'Device':
                                            payload = [1001];
                                            break;
                                        default:
                                            break;
                                    }
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
            } else if(request.url().includes('badinfo')){
                payload = {
                    error: {
                        name: "InvalidUserException",
                        message: "Bad info entered"
                    }
                }

                request.respond({
                    content: 'application/json',
                    headers: { 'Access-Controll-Allow-Origin': '*'},
                    body: JSON.stringify(rpcResponse(payload))
                });
            } else {
                request.continue();
            }
        });
        await page.goto('http://127.0.0.1:9000/test/web/');
    });

//#region Test to pass
    it('Should create the api object with a callback', async () => {
        api = await page.evaluate( (login) => {
            let api = new GeotabApi(function(callback){
                callback(
                    login.server,
                    login.database,
                    login.username,
                    login.password,
                    ( err ) => {api = err;}
                )
            }, {rememberMe: false});
            return api;
        }, mocks.login);
        assert.isDefined(api, 'Api not defined');
    });
    
    it('Should authenticate the API', async () => {
        let auth = await page.evaluate( async (login) => {

            let api = await new GeotabApi(function(callback){
                callback(
                    login.server,
                    login.database,
                    login.username,
                    login.password,
                    ( err ) => {api = err;}
                )
            }, {rememberMe: false});
            // Puppeteer doesn't like waiting for callbacks.
            // Using a promise to make it wait
            let sessionPromise = new Promise( (resolve, reject) => {
                let response = [];
                try {
                    api.getSession( (credentials, server) => {
                        response = [credentials, server];
                    });  
                    setInterval( () => {    
                        if(response.length > 0){
                            resolve(response);
                        }
                    }, 5);
                } catch (err) {
                    reject(err);
                }
            });

            // Awaiting the session promise to ensure we get the response
            let auth = await sessionPromise
                .then( (response) => {
                    return response;
                })
                .catch( (err) => { 
                    console.log(err);
                })
            return auth;

        }, mocks.login)
        assert.isNotEmpty(auth, 'Authentication is empty');
    });

    it('Should run a call method', async () => {
        let result = await page.evaluate( async (login) => {
            let api = await new GeotabApi(function(callback){
                callback(
                    login.server,
                    login.database,
                    login.username,
                    login.password,
                    ( err ) => {api = err;}
                )
            }, {rememberMe: false});

            let getPromise = new Promise( (resolve, reject) => {
                let response;
                api.call('Get', {typeName: 'Device'}, function(result){
                    response = result;
                }, function(error){
                    reject(error);
                });

                setInterval( () => {
                    if(typeof response !== 'undefined'){
                        resolve(response);
                    }
                }, 5);
            });

            let result = await getPromise
                .then( response => response)
                .catch( err => console.log(err));

            return result;
        }, mocks.login);

        assert.isDefined(result, 'Call request did not return a result');
    })

    it('Should run a multicall method', async () => {
        let result = await page.evaluate( async (login) => {
            let api = await new GeotabApi(function(callback){
                callback(
                    login.server,
                    login.database,
                    login.username,
                    login.password,
                    ( err ) => {api = err;}
                )
            }, {rememberMe: false});

            let getPromise = new Promise( (resolve, reject) => {
                let response = [];
                let calls = [
                    ["GetCountOf", { typeName: "Device" }],
                    ["GetCountOf", { typeName: "User" }]
                ];
                api.multiCall(calls, function(result){
                    response = result;
                }, function(error){
                    reject(error);
                });

                setInterval( () => {
                    if(response.length > 0){
                        resolve(response);
                    }
                }, 5);
            });

            let result = await getPromise
                .then( response => response)
                .catch( err => console.log(err));

            return result;
        }, mocks.login);

        assert.isDefined(result, 'Multi-call request did not return a result');
    })

    it('Should run forget method', async () => {
        let result = await page.evaluate( async (login) => {
            let api = await new GeotabApi(function(callback){
                callback(
                    login.server,
                    login.database,
                    login.username,
                    login.password,
                    ( err ) => {api = err;}
                )
            }, {rememberMe: false});

            let firstSession = new Promise( (resolve, reject) => {
                let response = [];
                try {
                    api.getSession( (credentials, server) => {
                        response = [credentials, server];
                    });  
                    setInterval( () => {    
                        if(response.length > 0){
                            resolve(response);
                        }
                    }, 5);
                } catch (err) {
                    reject(err);
                }
            });

            let secondSession = new Promise( (resolve, reject) => {
                let response = [];
                try {
                    api.getSession( (credentials, server) => {
                        response = [credentials, server];
                    });  
                    setInterval( () => {    
                        if(response.length > 0){
                            resolve(response);
                        }
                    }, 5);
                } catch (err) {
                    reject(err);
                }
            });

            // Before forgetting the session
            let firstID = await firstSession
                .then( async (response) => {
                    // Forgetting the session once we have the first one confirmed
                    await api.forget();
                    return response;
                })
                .catch( (err) => { 
                    console.log(err);
                })

            // After forgetting and renewing the session
            let secondID = await secondSession
                .then( (response) => {
                    return response;
                })
                .catch( (err) => {
                    console.log(err);
                });

            return firstID === secondID;
        }, mocks.login);

        assert.isFalse(result, 'Session ID\'s are the same');
    });
//#endregion
//#region Test to fail
    it('Should return errors with incorrect credentials', async () => {

        let result = await page.evaluate( async () => {
            let apiError;
            let api = await new GeotabApi(function(callback){
                callback(
                    "badInfo",
                    "badInfo",
                    "badInfo",
                    "badInfo",
                    ( err ) => { apiError = err}
                )
            }, {rememberMe: false});

            await api.forget();
            let getPromise = new Promise( (resolve, reject) => {
                let response;
                api.call('Get', {typeName: 'Device'}, function(result){
                    response = result;
                }, function(error){
                    reject(error);
                });

                let attempts = 0;
                setInterval( () => {
                    attempts ++;
                    if(typeof response !== 'undefined'){
                        resolve(response); 
                    }
                    if(apiError){
                        reject(apiError);
                    }
                    if( attempts === 500){
                        reject('authentication never resolves');
                    }
                }, 5);
            });
            
            let result = await getPromise
                .then( response => response)
                .catch( err => err);

            return result;
        });

        assert.equal(result.name, 'InvalidUserException', 'API does not fail');
    });
//#endregion
//#region Credentials not callback
    it('Should authenticate without callback', async () => {

        let api = await page.evaluate( (login) => {
            let api = new GeotabApi(login, {rememberMe: false});
            return api;
        }, mocks.login);

        assert.isDefined(api, 'Api object did not define');
    });

    it('Should make a call request without callback auth', async () => {
        let result = await page.evaluate( async (login) => {
            let api = new GeotabApi( login, {rememberMe:false});
            let result;

            let getPromise = new Promise( (resolve, reject) => {
                let response;
                api.call('Get', {typeName: 'Device'}, function(result){
                    response = result;
                }, function(error){
                    reject(error);
                });

                setInterval( () => {
                    if(typeof response !== 'undefined'){
                        resolve(response);
                    }
                }, 5);
            });

            result = await getPromise
                .then( response => response)
                .catch( err => console.log(err));

            return result;
        }, mocks.login);

        assert.isUndefined(result.error, 'Error message received');
        assert.isDefined(result, 'result undefined');
    })

    after( async () => {
        browser.close();
    })
});