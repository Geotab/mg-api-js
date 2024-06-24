const assert = require('chai').assert;
const GeotabApi = require('../../lib/GeotabApi.js').default;
const mocks = require('../mocks/mocks');
const login = mocks.login;
require('./nocks/nock');
require('source-map-support').install();

/**
 *  Tests the core functionality of failing cases
 *  Tests failures against call -> Call will be the failing point of most requests
 *  via bad args or credentials
 */
describe('User loads GeotabApi node module and triggers an AxiosError', async () => {
    it('Propagates exception from Axios that URL not found', async () => {
        let login = mocks.login;
        let api = new GeotabApi({
                credentials: {
                    database: login.credentials.database,
                    userName: login.credentials.username,
                    password: login.credentials.password
                },
                path: "foo.bar.baz",
        }, {rememberMe: false})

        let result = await api.call('Get', {typeName: 'Device'})
            .then( result => result)
            .catch( err => err);
        assert.isTrue(result.message.includes('ENOTFOUND'), 'Expect error message for invalid URL');
    });
});
