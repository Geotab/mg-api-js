const assert = require('chai').assert;
const GeotabApi = require('../../dist/api.min.js');
const mocks = require('../mocks/mocks');
require('./nocks/nock');
require('source-map-support').install();

/**
 *  Tests the core functionality of failing cases
 *  Tests failures against call -> Call will be the failing point of most requests
 *  via bad args or credentials
 */

describe('User loads GeotabApi node module with credentials', async () => {

    it('Api should initialize', async () => {
        let api = new GeotabApi(mocks.login, {rememberMe: false});
        assert.isDefined(api.call);
    });

    it('Api should successfully run a call (Callback)', async () => {
        let api = new GeotabApi(mocks.login, {rememberMe: false});
        let callPromise = new Promise( (resolve, reject) => {
            api.call('Get', {typeName: 'Device'}, function(success){
                resolve(success);
            }, function(error){
                reject(error);
            });
        });

        let response = await callPromise
            .then( resolved => resolved )
            .catch( error => console.log('rejected', error) );
        assert.isTrue(response.name === 'DeviceName', 'Call did not return information');
    });

    it('Api should successfully run a call (Async)', async () => {
        let api = new GeotabApi(mocks.login, {rememberMe: false});
        let call = api.call('Get', {typeName: 'Device'});
        let response = await call
                        .then( result => result )
                        .catch( err => console.log('err', err.message) );
        assert.isTrue(response.name === 'DeviceName', 'Promise response undefined');
    })

    it('Api should successfully run getSession (Callback)', async () => {
        let api = new GeotabApi(mocks.login, {rememberMe: false});
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
        let auth = await sessionPromise
            .then( (response) => response )
            .catch( (err) => console.log(err) );
        assert.isTrue(auth.credentials.userName === 'testUser@test.com', 'Credentials not properly received');
        assert.equal(auth.path, 'www.myaddin.com', 'Server is not matching expected output')
    });

    it('Api should successfully run getSession (Async)', async () =>{
        let api = new GeotabApi(mocks.login, {rememberMe: false});
        let server, credentials;
        // getSession returns an unresolved promise
        let call = api.getSession();
        await call.then( response => {
            // Response should have a .then appended in the api to add the server
            // to the result
            credentials = response.credentials;
            server = response.path;
        })
        .catch( err => console.log(err));

        assert.isObject(credentials, 'Credentials not properly received');
        assert.equal(server, 'www.myaddin.com', 'Server is not matching expected output')
    });

    it('Api should run multicall (callback)', async () => {
        let api = new GeotabApi(mocks.login, {rememberMe: false});
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

        assert.isTrue(result.length > 0, 'Multicall did not return list');
    });

    it('Api should run multi call (async)', async () => {
        let api = new GeotabApi(mocks.login, {rememberMe: false});
        let calls = [
            ["GetCountOf", { typeName: "Device" }],
            ["GetCountOf", { typeName: "User" }]
        ];
        let multicall = api.multiCall(calls);
        // multicall returns a promise
        let response = await multicall
            .then( result => result )
            .catch( err => console.log(err));
        assert.isTrue( response.length === 2, 'Response does not match expected output');
    });

    it('Api should run forget', async () => {
        let api = new GeotabApi(mocks.login, {rememberMe: true});
        let auth1 = await api.getSession().then( response => response.credentials.sessionId );
        let auth2 = await api.forget().then( response => response.credentials.sessionId );
        assert.notEqual(auth1, auth2, 'Session did not refresh');
    });

    it('Api rememberMe should function properly', async () => {
        let auth = JSON.parse(JSON.stringify(mocks.login));
        auth.credentials.sessionId = '123456';
        let api = new GeotabApi(auth, {rememberMe: true});
        let session = await api.getSession();
        assert.equal(auth.credentials.sessionId, session.credentials.sessionId, 'SessionIDs are not remembered');
    });

    it('Should support a synchronous custom CredentialStore', async () => {
        let value = false;
        let calls = {get: 0, set: 0, clear: 0, invalidSet: 0};
        let store = {
            get: () => {
                calls.get++;
                return value;
            },
            set: (credentials, server) => {
                calls.set++;
                if (!credentials) {
                    calls.invalidSet++;
                }
                value = {credentials, server};
            },
            clear: () => {
                calls.clear++;
                value = false;
            }
        };

        let firstLogin = JSON.parse(JSON.stringify(mocks.login));
        delete firstLogin.credentials.sessionId;
        let api1 = new GeotabApi(firstLogin, {rememberMe: true, newCredentialStore: store});
        let session1 = await api1.getSession();
        let secondLogin = JSON.parse(JSON.stringify(firstLogin));
        secondLogin.path = 'unused.example';
        let api2 = new GeotabApi(secondLogin, {rememberMe: true, newCredentialStore: store});
        let session2 = await api2.getSession();
        await api2.forget();

        assert.isAtLeast(calls.get, 2, 'Custom store was not read');
        assert.isAtLeast(calls.set, 1, 'Custom store was not written');
        assert.equal(calls.invalidSet, 0, 'Custom store received an empty credential object');
        assert.equal(calls.clear, 1, 'Custom store was not cleared by forget');
        assert.equal(session2.credentials.sessionId, session1.credentials.sessionId, 'Custom store session was not reused');
        assert.equal(session2.path, mocks.server, 'Custom store server was not restored');
        assert.equal(value.server, mocks.server, 'Refreshed session was not written with the restored server');
    });

    it('Should return node http response objects', async () => {
        let api = new GeotabApi(mocks.login, {fullResponse: true});
        let calls = [["GetCountOf", { typeName: "Device" }], ["GetCountOf", { typeName: "User" }]];

        let authenticate = await api.authenticate();
        let call = await api.call('Get', {typeName: 'Device'});
        let multicall = await api.multiCall(calls);
        let forget = await api.forget();
        let getSession = await api.getSession();

        assert.isObject( getSession.data.result.credentials, 'GetSession response not formed as an http.ServerResponse response object');
        assert.isTrue( authenticate.data && authenticate.statusCode === 200, 'Authenticate response not formed as http.ServerResponse response object');
        assert.isTrue( call.data && call.statusCode === 200, 'Call response not formed as http.ServerResponse response object');
        assert.isTrue( multicall.data && multicall.statusCode === 200, 'MultiCall response not formed as http.ServerResponse response object');
        assert.isTrue( forget.data && forget.statusCode === 200, 'Forget response not formed as http.ServerResponse response object');
    })
});
