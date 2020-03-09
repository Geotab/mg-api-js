const assert = require('chai').assert;
const GeotabApi = require('../../dist/api');
const mocks = require('../mocks/mocks');
const login = mocks.login;
require('./nocks/nock');

/**
 *  Tests the core functionality of failing cases
 *  Tests failures against call -> Call will be the failing point of most requests
 *  via bad args or credentials 
 */

describe('User loads GeotabApi node module with a callback', async () => {

    it('Api should initialize', () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => console.log(err)
            );
        }, {rememberMe: false});
        assert.isDefined(api);
    });

    it('Api should successfully run a call (Callback)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => console.log(err)
            );
        }, {rememberMe: false});

        let callPromise = new Promise( (resolve, reject) => {
            api.call('Get', {typeName: 'Device'}, function(success){
                resolve(success);
            }, function(error){
                reject(error);
            });
        });

        let response = await callPromise
            .then( resolved => resolved)
            .catch( error => console.log('rejected', error) );
        assert.isTrue(response.name === 'DeviceName', 'Call did not return information');
    });

    it('Api should successfully run a call (Async)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => console.log(err)
            );
        }, {rememberMe: false});
        // api.call returns a promise
        let call = api.call('Get', {typeName: 'Device'});
        let response = await call
            .then( result => result )
            .catch( err => console.log('err', err.message) )
        assert.isTrue(response.data.result.name === 'DeviceName', 'Promise response undefined');
    })

    it('Api should successfully run getSession (Callback)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => console.log(err)
            );
        }, {rememberMe: false});
        
        let sessionPromise = new Promise( (resolve, reject) => {
            try {
                api.getSession( (credentials, server) => {
                    resolve([credentials, server]);
                });  
            } catch (err) {
                reject(err);
            }
        });

        // Awaiting the session promise to ensure we get the response
        let auth = await sessionPromise
            .then( response => response)
            .catch( (err) => console.log(err) );        

        assert.isObject(auth[0], 'Credentials not properly received');
        assert.equal(auth[1], 'www.myaddin.com', 'Server is not matching expected output');
    });

    it('Api should successfully run getSession (Async)', async () =>{
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => console.log(err)
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
                ( err ) => console.log(err)
            );
        }, {rememberMe: false});

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
        
        assert.isTrue(result.length === 2, 'Multicall did not return list');
    });

    it('Api should run multi call (async)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => console.log(err)
            );
        }, {rememberMe: false});

        let calls = [
            ["GetCountOf", { typeName: "Device" }],
            ["GetCountOf", { typeName: "User" }]
        ];

        let multicall = api.multiCall(calls);
        // multicall returns a promise
        let response = await multicall
            .then( result => result.data.result )
            .catch( err => console.log(err));

        assert.isTrue( response.length === 2, 'Response does not match expected output');
    });

    it('Api should run forget', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => console.log(err)
            );
        }, {rememberMe: true});

        let sessionPromise = new Promise( (resolve, reject) => {
            try {
                api.getSession( (credentials, server) => {
                    resolve([credentials, server]);
                });  
            } catch (err) {
                reject(err);
            }
        });

        // Awaiting the session promise to ensure we get the response
        let auth1 = await sessionPromise
            .then( (response) => response )
            .catch( (err) => console.log(err) );  
        
        await api.forget();

        let sessionPromise2 = new Promise( (resolve, reject) => {
            try {
                api.getSession( (credentials, server) => {
                    resolve([credentials, server]);
                });  
            } catch (err) {
                reject(err);
            }
        });

        // Awaiting the session promise to ensure we get the response
        let auth2 = await sessionPromise2
            .then( (response) => response )
            .catch( (err) => console.log(err) );     
        assert.notEqual(auth1[0].sessionId, auth2[0].sessionId, 'Session did not refresh');
    });

    it('Should run forget (Promise)', async () => {
        let api = new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.username,
                login.password,
                ( err ) => console.log(err)
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
    });

    it('Api rememberMe should function properly', async () => {
        let api1 = await new GeotabApi(function(callback){
            callback(
                login.server,
                login.database,
                login.userName,
                login.password,
                ( err ) => {console.log(err)}
            )
        }, {rememberMe: true});

        let api2 = await new GeotabApi(function(callback){
                callback(
                    login.server,
                    login.database,
                    login.userName,
                    login.password,
                    ( err ) => {console.log(err)}
                )
            }, {rememberMe: true});

        let sess1 = await api1.getSession()
                                .then(response => response.data.result[0].sessionId)
                                .catch(err => console.log(err));
        let sess2 = await api2.getSession()
                                .then(response => response[0].sessionId)
                                .catch(err => console.log(err));
        assert.isTrue( sess1 === sess2, 'Session IDs do not match');
    });
});