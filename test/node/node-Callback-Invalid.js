const assert = require('chai').assert;
const GeotabApi = require('../../dist/api');
const mocks = require('../mocks/mocks');
const login = mocks.login;
require('./nocks/nock');

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
describe('User loads GeotabApi node module with a callback and invalid user credentials', async () => {
    it('Api should not allow a call with bad credentials', async () => {
        let error;
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                'badinfo',
                login.username,
                login.password,
                ( err ) => {error = err;}
            );
        }, {rememberMe: false});

        let response;
        let callPromise = new Promise( (resolve, reject) => {
            let response;
            api.call('Get', {typeName: 'Device'}, function(success){
                response = success;
            }, function(error){
                console.log('error', error)
                reject(error);
            });

            setInterval( () => {
                if(typeof error !== 'undefined'){
                    resolve(error);
                }
            }, 5);
        });

        await callPromise
            .then( resolved => {
                // In this case, the "resolved" should be our error
                response = resolved;
            })
            .catch( error => {
                console.log('rejected', error);
            });
        console.log(response);
        assert.isTrue(response.name === 'InvalidUserException', 'Given credentials accepted as valid');
    });
        
    it('Api should gracefully handle a call failure (Callback)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => {api = err;}
            );
        }, {rememberMe: false});

        let response;
        let callPromise = new Promise( (resolve, reject) => {
            let response;
            api.call('Geet', {typeName: 'Device'}, function(success){
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

    it('Api should gracefully handle a call failure (Async)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => {api = err;}
            );
        }, {rememberMe: false});
        // api.call returns a promise
        let call = api.call('Get', {typeName: 'Device'});
        let response;
        await call.then( result => {
            response = result} )
            .catch( err => console.log('err', err.message) );
        assert.isDefined(response.data, 'Promise response undefined');
    })

    /*
    it('Api should successfully run getSession (Callback)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => {api = err;}
            );
        }, {rememberMe: false});
        
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

    it('Api should successfully run getSession (Async)', async () =>{
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => {api = err;}
            );
        }, {rememberMe: false});

        let server, credentials;
        // getSession returns an unresolved promise
        let call = api.getSession();
        await call.then( response => {
            // Response should have a .then appended in the api to add the server
            // to the result
            credentials = response.data.result[0];
            server = response.data.result[1];
        })
        .catch( err => console.log(err));

        assert.isObject(credentials, 'Credentials not properly received');
        assert.equal(server, 'www.myaddin.com', 'Server is not matching expected output')        
    });
    
    it('Api should run multicall (callback)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => {api = err;}
            );
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
        
        assert.isTrue(result.length > 0, 'Multicall did not return list');
    });

    it('Api should run multi call (async)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => {api = err;}
            );
        }, {rememberMe: false});

        let calls = [
            ["GetCountOf", { typeName: "Device" }],
            ["GetCountOf", { typeName: "User" }]
        ];

        let response;
        let multicall = api.multiCall(calls);
        // multicall returns a promise
        await multicall.then( result => {
            response = result.data.result;
        }).catch( err => console.log(err));

        assert.isTrue( response.length === 2, 'Response does not match expected output');
    });

    it('Api should run forget', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => {api = err;}
            );
        }, {rememberMe: true});

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
        assert.notEqual(auth1[0].sessionId, auth2[0].sessionId, 'Session did not refresh');
    });

    it('Should run forget (Promise)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => {api = err;}
            );
        }, {rememberMe: false});

        let sess1 = await api.getSession()
                        .then(result => result.data.result[0].sessionId)
                        .catch(err => console.log(err));

        // Forget will return a promise with new credentials
        let sess2 = await api.forget()
                        .then( result => result.data.result[0].sessionId)
                        .catch( err => console.log(err));
        assert.isTrue( sess1 !== sess2, 'Sessions did not update properly');
    });*/
});