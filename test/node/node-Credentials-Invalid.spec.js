const assert = require('chai').assert;
const GeotabApi = require('../../dist/api.min.js');
const mocks = require('../mocks/mocks');
const login = mocks.login;
require('./nocks/nock');
require('source-map-support').install();

/**
 *  Tests the core functionality of failing cases
 *  Tests failures against call -> Call will be the failing point of most requests
 *  via bad args or credentials 
 */
describe('User loads GeotabApi node module and triggers an error (Credentials)', async () => {
    it('Api should not allow a call with bad credentials', async () => {
        let login = mocks.login;
        let api = new GeotabApi({
                credentials: {
                    database: 'badinfo',
                    userName: login.credentials.username,
                    password: login.credentials.password
                },
                path: login.path,
        }, {rememberMe: false})

        let result = await api.call('Get', {typeName: 'Device'})
            .then( result => result)
            .catch( err => err);
        assert.isTrue(result.message.includes('InvalidUserException'), 'Given credentials accepted as valid');
    });
        
    it('Api should gracefully handle a call failure (Callback)', async () => {
        let login = mocks.login;
        let api = new GeotabApi({
                credentials: {
                    database: login.credentials.database,
                    userName: login.credentials.username,
                    password: login.credentials.password
                },
                path: login.path,
        }, {rememberMe: false});

        let callPromise = new Promise( (resolve, reject) => {
            api.call('Geet', {typeName: 'Device'}, function(success){
                resolve(success);
            }, function(error){
                reject(error);
            });
        });

        let response = await callPromise
                        .then( resolved => resolved )
                        .catch( error => error );
        assert.isTrue(response.name.includes('InvalidRequest'), 'Call did not return information');
    });

    it('Api should gracefully handle a call failure (Async)', async () => {
        let login = mocks.login;
        let api = new GeotabApi({
            credentials: {
                database: login.credentials.database,
                userName: login.credentials.username,
                password: login.credentials.password
            },
            path: login.path,
        }, {rememberMe: false});

        // api.call returns a promise
        let call = api.call('Geet', {typeName: 'Device'});
        let response = await call
                            .then( result => result )
                            .catch( err => err );
        assert.isTrue(response.message.includes('InvalidRequest'), 'Promise response undefined');
    });
});