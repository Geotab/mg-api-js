const assert = require('chai').assert;
const GeotabApi = require('../../dist/api');
const mocks = require('../mocks/mocks');
require('./nocks/nock');
/**
 * Unpacks the URIEncoded JSON-RPC string in the Nock request
 * 
 * @param {String} string JSON-RPC URIEncoded string
 */
function unpackJSONRPC(URI){
    let unpacked;
    unpacked = decodeURI(URI);
    return unpacked;
}


/**
 * 
 *  REQUIREMENTS
 * --------------
 * 
 * Must cover:
 *  - With Credentials/With Callback
 *      - Authentication
 *      - Calls (Async/Promise/Callback)
 *      - GetSession (Async/Promise/Callback)
 *      - MultiCalls (Async/Promise/Callback)
 *      - forget
 * 
 * (22 Tests)
 * 
 */

describe('User loads GeotabApi node module with credentials', async () => {

    it('Api should initialize', () => {
        let api = new GeotabApi(mocks.login, {rememberMe: false});
        assert.isDefined(api);
    });

    it('Api should successfully run a call (Callback)', async () => {
        let api = new GeotabApi(mocks.login, {rememberMe: false});
        let response;
        let callPromise = new Promise( (resolve, reject) => {
            let response;
            api.call('Get', {typeName: 'Device'}, function(success){
                response = success
            }, function(error){
                console.log('error', error)
                reject(error);
            });

            setInterval( () => {
                if(typeof response !== 'undefined'){
                    resolve(response);
                }
            }, 5);
        });

        await callPromise
            .then( resolved => {
                response = resolved;
            })
            .catch( error => {
                console.log('rejected', error);
            });
        
        assert.isDefined(response, 'Call did not return information');
    });

    // it('Api should successfully run a call (Aync)')
    // it('Api should successfully run a call (Promise)')

    it('Api should successfully run getSession (Callback)', async () => {
        let api = await new GeotabApi(mocks.login, {rememberMe: false});
        
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

        assert.isDefined(auth, 'getSession callback did not return information');
    });

    // it('Api should successfully run getSession (async)')
    // it('Api should run getSession (Promise)')
    
    it('Api should run multicall (callback)', async () => {
        let api = await new GeotabApi(mocks.login, {rememberMe: false});

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
        
        assert.isTrue(result.length > 0, 'Multicall did not return list');
    });

    // it('Api should run multi call (async)')
    // it('Api should run multi call (Promise)')

    it('Api should run forget ()', async () => {
        let api = await new GeotabApi(mocks.login, {rememberMe: false});

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
        let auth1 = await sessionPromise
            .then( (response) => {
                return response;
            })
            .catch( (err) => { 
                console.log(err);
            })  
        
        await api.forget();

        let sessionPromise2 = new Promise( (resolve, reject) => {
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
        let auth2 = await sessionPromise2
            .then( (response) => {
                return response;
            })
            .catch( (err) => { 
                console.log(err);
            });     
        assert.notEqual(auth1, auth2, 'Session did not refresh');
    });
});