const assert = require('chai').assert;
const GeotabApi = require('../../lib/GeotabApi.js').default;
const mocks = require('../mocks/mocks');
const LocalStorageCredentialStore = require('../../lib/LocalStorageCredentialStore').default;
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
        let auth = mocks.login;
        auth.credentials.sessionId = '123456';
        let api = new GeotabApi(auth, {rememberMe: true});
        let session = await api.getSession();
        assert.equal(auth.credentials.sessionId, session.credentials.sessionId, 'SessionIDs are not remembered');
    });

    it('Should take a custom CredentialStore', async () => {
        // Custom store with custom behaviour
        let store = {
            get: () => {
                return {
                    credentials: {
                      userName: 'Custom',
                      password: 'Store',
                      database: 'testDB',
                      sessionId: '000000'
                    },
                    path: 'CustomStore'
                }
            },
            set: () => {/* Custom Set - ignores default behavior to set with provided credentials */},
            clear: () => {},
            custom: () => {}
        };

        let api = new GeotabApi(mocks.login, {rememberMe: true, newCredentialStore: store});
        let sessionId = await api.getSession()
            .then( data => data.credentials.sessionId)
            .catch( err => err);
        assert.equal(sessionId, '000000', 'SessionId being updated and returned instead of following custom store logic');
    });

    it('Should return axios response objects', async () => {
        let api = new GeotabApi(mocks.login, {fullResponse: true});
        let calls = [["GetCountOf", { typeName: "Device" }], ["GetCountOf", { typeName: "User" }]];

        let authenticate = await api.authenticate();
        let call = await api.call('Get', {typeName: 'Device'});
        let multicall = await api.multiCall(calls);
        let forget = await api.forget();
        let getSession = await api.getSession();

        assert.isObject( getSession.data.result.credentials, 'GetSession response not formed as Axios response object');
        assert.isTrue( authenticate.data && authenticate.status === 200, 'Authenticate response not formed as Axios response object');
        assert.isTrue( call.data && call.status === 200, 'Call response not formed as Axios response object');
        assert.isTrue( multicall.data && multicall.status === 200, 'MultiCall response not formed as Axios response object');
        assert.isTrue( forget.data && forget.status === 200, 'Forget response not formed as Axios response object');
    })
});
