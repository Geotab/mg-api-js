const assert = require('chai').assert;
const mocks = require('../mocks/mocks.js');
const serverSetup = require('./serverSetup');
/**
 * Test cases for:
 *  - API functionality with callback
 *      - Runs basic 4 functions
 *      - Runs JSONP request
 *      - Test to fail on call method
 * 
 *  All callback tests using puppeteer's evaluate command must be 
 *      wrapped in a promise -> puppeteer does not like waiting for
 *      callbacks to finish and will return null values unless explicitly
 *      made to wait with callbacks
 */
describe('User loads web api with callback', () => {
    let browser,
        page;

    //Sets up mock server
    before(async () => {
        // es6 destructuring
        [browser, page] = await serverSetup();
    });

//#region Test to pass
    it('Api Should initialize', async () => {
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
    
    it('Api should successfully run a call (callback)', async () => {
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

    it('Api should successfully run a call (async)', async () => {
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
            let result = await api.call('Get', {typeName: 'Device'})
                .then(result => result)
                .catch(err => console.log(err));
            return result;
        }, mocks.login);
        assert.isDefined(result.data.result, 'Result is not defined');
    })

    it('Api should successfully run getSession (callback)', async () => {
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

    it('Api should successfully run getSession (async)', async () => {
        let [credentials, server] = await page.evaluate( async (login) => {
            let api = await new GeotabApi(function(callback){
                callback(
                    login.server,
                    login.database,
                    login.username,
                    login.password,
                    ( err ) => {api = err;}
                )
            }, {rememberMe: false});            
            let credentials, server;
            await api.getSession()
                .then( response => {
                    // Response should have a .then appended in the api to add the server
                    // to the result
                    credentials = response.data.result[0];
                    server = response.data.result[1];
                })
                .catch( err => console.log(err));
            return [credentials, server];    
        }, mocks.login);

        assert.isObject(credentials, 'Credentials not properly received');
        assert.equal(server, 'www.myaddin.com', 'Server is not matching expected output');
    });

    it('Api should run multicall (callback)', async () => {
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

    it('Api should run mutlicall (async)', async () => {
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

            let calls = [
                ["GetCountOf", { typeName: "Device" }],
                ["GetCountOf", { typeName: "User" }]
            ];
    
            let response;
            let multicall = api.multiCall(calls);
            // multicall returns a promise
            await multicall.then( result => {response = result.data.result;})
                .catch( err => console.log(err));

            return response;
        }, mocks.login);

        assert.isTrue(result.length === 2, 'Multicall not returning expected array');
    })

    it('Api should run forget', async () => {
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

    it('Api should run forget (async)', async () => {
        let [sess1, sess2] = await page.evaluate( async (login) => {
            let api = await new GeotabApi(function(callback){
                callback(
                    login.server,
                    login.database,
                    login.username,
                    login.password,
                    ( err ) => {api = err;}
                )
            }, {rememberMe: false});


            let sess1 = await api.getSession()
                .then(result => result.data.result[0].sessionId)
                .catch(err => console.log(err));

            // Forget will return a promise with new credentials
            let sess2 = await api.forget()
                .then( result => result.data.result[0].sessionId)
                .catch( err => console.log(err));
            
            return [sess1, sess2];
            
        }, mocks.login);

        assert.isTrue(sess1 !== sess2, 'Session IDs are the same');
    })

    it('Api should send a JSONP request', async () => {
        let result = await page.evaluate( (login) => {
            window.geotabJSONP = function (data) {
                console.log(data);
            }
            let api = new GeotabApi(function(callback){
                callback(
                    login.server,
                    login.database,
                    login.userName,
                    login.password,
                    ( err ) => {api = err;}
                )
            }, {rememberMe: false, jsonp: true});
    
            let resultPromise = new Promise( (resolve, reject) => {
                let response;
                api.call('Get', {typeName: 'Device'}, function(success){
                    console.log('success');
                    response = success;
                }, function(error){
                    reject(error);
                });
    
                setInterval( () => {
                    if(typeof response !== 'undefined'){
                        resolve(response);
                    }
                }, 50);
            });
    
            let result = resultPromise
                .then( response => result = response)
                .catch( err => console.log(err));
            return result;
        }, mocks.login);

        assert.isDefined(result, 'JSONP did not return a result');

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
                    if(typeof apiError !== 'undefined'){
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

    it('Api should gracefully handle call errors', async () => {

        let result = await page.evaluate( async (login) => {
            let apiError;
            let api = new GeotabApi(function(callback){
                callback(
                    login.server,
                    login.database,
                    login.userName,
                    login.password,
                    ( err ) => {apiError = err;}
                )
            }, {rememberMe: false});
    
            let getPromise = new Promise( (resolve, reject) => {
                let response;
                // Malformed call
                api.call('Geet', {typeName: 'Device'}, function(result){
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
                    if(typeof apiError !== 'undefined'){
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
        }, mocks.login);
        assert.equal(result.name, 'InvalidCall', 'API does not fail on malformed calls');
    });
//#endregion

    // Closing the browser when we're done
    after( async () => {
        browser.close();
    })
});