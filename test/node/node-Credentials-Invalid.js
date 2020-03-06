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
describe('User loads GeotabApi node module and triggers an error (Credentials)', async () => {
    it('Api should not allow a call with bad credentials', async () => {
        let error;
        let login = mocks.login;
        let api = new GeotabApi({
            server: login.server,
            database: 'badinfo',
            username: login.username,
            password: login.password,
            error: (err) => { error = err;}
        }, {rememberMe: false});

        let callPromise = new Promise( (resolve, reject) => {
            api.call('Get', {typeName: 'Device'}, function(success){
                resolve(success);
            }, function(err){
                reject(error);
            });

            setInterval( () => {
                if(typeof error !== 'undefined'){
                    resolve(error);
                }
            }, 5);
        });

        let response = await callPromise
            .then( resolved => {
                // In this case, the "resolved" should be our error
                return resolved;
            })
            .catch( error => {
                // Rejections here should also be considered a failure as
                // MYG should send a response with an error embedded
                console.log('rejected', error);
            });
        assert.isTrue(response.name === 'InvalidUserException', 'Given credentials accepted as valid');
    });
        
    it('Api should gracefully handle a call failure (Callback)', async () => {
        let login = mocks.login;
        let api = new GeotabApi({
            server: login.server,
            database: login.database,
            username: login.username,
            password: login.password
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
                        .catch( error => console.log('rejected', error) );
        assert.isTrue(response.error.name === 'InvalidRequest', 'Call did not return information');
    });

    it('Api should gracefully handle a call failure (Async)', async () => {
        let login = mocks.login;
        let api = new GeotabApi({
            server: login.server,
            database: login.database,
            username: login.username,
            password: login.password
        }, {rememberMe: false});
        // api.call returns a promise
        let call = api.call('Geet', {typeName: 'Device'});
        let response = await call
                            .then( result => result )
                            .catch( err => console.log('err', err.message) );
        assert.isTrue(response.data.result.error.name === 'InvalidRequest', 'Promise response undefined');
    });
});