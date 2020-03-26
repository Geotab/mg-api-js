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
describe('User loads web api with credentials', () => {
    let browser,
        page,
        api; // Scoping API for use in all calls

    //Sets up mock server
    before(async () => {
        // es6 destructuring
        [browser, page] = await serverSetup();
    });

    it('Api Should initialize', async () => {
        api = await page.evaluate( async (login) => {
            let api = await new GeotabApi(login, {rememberMe: false});
            return api;
        }, mocks.login);
        assert.isDefined(api, 'Api not defined');
    });
    
    it('Api should successfully run a call (callback)', async () => {
        let result = await page.evaluate( async (login) => {
            let api = await new GeotabApi(login, {rememberMe: false});
            let getPromise = new Promise( (resolve, reject) => {
                api.call('Get', {typeName: 'Device'}, function(result){
                    resolve(result);
                }, function(error){
                    reject(error);
                });
            });

            let result = await getPromise
                .then( response => response)
                .catch( err => console.log(err));
            return result;
        }, mocks.login);
        assert.isTrue(result[0].name === 'DeviceName', 'Call request did not return a result');
    })

    it('Api should successfully run a call (async)', async () => {
        let result = await page.evaluate( async (login) => {
            let api = await new GeotabApi(login, {rememberMe: false});
            let result = await api.call('Get', {typeName: 'Device'})
                .then(result => result)
                .catch(err => console.log(err));
            return result;
        }, mocks.login);
        assert.isDefined(result.data.result, 'result is not defined');
    })

    it('Api should successfully run getSession (callback)', async () => {
        let auth = await page.evaluate( async (login) => {
            let api = await new GeotabApi(login, {rememberMe: false});
            // Puppeteer doesn't like waiting for callbacks.
            // Using a promise to make it wait
            let sessionPromise = new Promise( (resolve, reject) => {
                try {
                    api.getSession( (credentials) => {
                        resolve(credentials);
                    });  
                } catch (err) {
                    reject(err);
                }
            });

            // Awaiting the session promise to ensure we get the response
            let auth = await sessionPromise.then( response => response )
                                            .catch( error => error );
            return auth;
        }, mocks.login);

        assert.isTrue(auth.credentials.database === 'testDB', 'Credentials not properly received');
        assert.equal(auth.path, 'ThisServer', 'Server is not matching expected output');
    });

    it('Api should successfully run getSession (async)', async () => {
        let [credentials, server] = await page.evaluate( async (login) => {
            let api = await new GeotabApi(login, {rememberMe: false})
            
            let credentials, server;
            await api.getSession()
                .then( response => {
                    // Response should have a .then appended in the api to add the server
                    // to the result
                    credentials = response.data.result.credentials;
                    server = response.data.result.path;
                })
                .catch( err => console.log(err));
            return [credentials, server];    
        }, mocks.login);
        
        assert.isObject(credentials, 'Credentials not properly received');
        assert.equal(server, 'ThisServer', 'Server is not matching expected output');
    });

    it('Api should run multicall (callback)', async () => {
        let result = await page.evaluate( async (login) => {
            let api = await new GeotabApi(login, {rememberMe: false})

            let getPromise = new Promise( (resolve, reject) => {
                let calls = [
                    ["GetCountOf", { typeName: "Device" }],
                    ["GetCountOf", { typeName: "User" }]
                ];
                api.multiCall(calls, function(result){
                    resolve(result);
                }, function(error){
                    reject(error);
                });
            });

            let result = await getPromise
                .then( response => response)
                .catch( err => console.log(err));
            return result;
        }, mocks.login);
        assert.isTrue(result.length === 2, 'Multi-call request did not return a result');
    })

    it('Api should run mutlicall (async)', async () => {
        let result = await page.evaluate( async (login) => {
            let api = await new GeotabApi(login, {rememberMe: false})

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
            let api = await new GeotabApi(login, {rememberMe: true});
            let auth1 = await api.getSession().then( response => response.data.result.credentials.sessionId );
            let auth2 = await api.forget().then( response => response.data.result.credentials.sessionId );
            return [auth1, auth2];
        }, mocks.login);
        assert.isFalse(result[0] === result[1], 'Session ID\'s are the same');
    });

    it('Api rememberMe should function properly', async () => {
        let result = await page.evaluate( async (login) => {
            let api1 = await new GeotabApi(login, {rememberMe: true});
            let api2 = await new GeotabApi(login, {rememberMe: true});
            let sess1 = await api1.getSession()
                                    .then(response => response.data.result[0].sessionId)
                                    .catch(err => console.log(err));
            let sess2 = await api2.getSession()
                                    .then(response => response.data.result[0].sessionId)
                                    .catch(err => console.log(err));
            return [sess1, sess2];
        }, mocks.login);
        assert.isTrue( result[0] === result[1], 'Session IDs do not match');
    });
//#region Test to fail
it('Should return errors with incorrect credentials', async () => {

    let result = await page.evaluate( async () => {
        let api = await new GeotabApi({
            server: 'badinfo',
            database: 'badinfo',
            username: 'badinfo',
            password: 'badinfo'
        }, {rememberMe: false});
        let callResult = api.call('Get', {typeName: 'Devices'}).then(result => result);
        return callResult;
    });
    assert.equal(result.error.name, 'InvalidUserException', 'API does not fail');
});

it('Api should gracefully handle call errors', async () => {

    let result = await page.evaluate( async (login) => {
        let apiError;
        login.error = (err) => apiError = err;
        let api = await new GeotabApi(login, {rememberMe: false});
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

    after(async () => {
        browser.close();
    });
});