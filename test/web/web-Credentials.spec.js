const assert = require('chai').assert;
const mocks = require('../mocks/mocks.js');
const serverSetup = require('./serverSetup');
const GeotabApi = require('../../lib/GeotabApi.js').default;

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
        api = await page.evaluate(async (login) => {
            let api = new GeotabApi(login, { rememberMe: false });
            return api;
        }, mocks.login);
        assert.isDefined(api, 'Api not defined');
    });

    it('Api should successfully run a call (callback)', async () => {
        let result = await page.evaluate(async (login) => {
            let api = new GeotabApi(login, { rememberMe: false });
            let getPromise = new Promise((resolve, reject) => {
                api.call('Get', { typeName: 'Device' }, function (result) {
                    resolve(result);
                }, function (error) {
                    reject(error);
                });
            });

            let result = await getPromise
                .then(response => response)
                .catch(err => console.log(err));
            return result;
        }, mocks.login);
        assert.isTrue(result[0].name === 'DeviceName', 'Call request did not return a result');
    })

    it('Api should successfully run a call (async)', async () => {
        let result = await page.evaluate(async (login) => {
            let api = new GeotabApi(login, { rememberMe: false });
            let result = await api.call('Get', { typeName: 'Device' })
                .then(result => result)
                .catch(err => console.log(err));
            return result;
        }, mocks.login);
        assert.isTrue(result[0].id === 'test1', 'result is not defined');
    })

    it('Api should successfully run getSession (callback)', async () => {
        let auth = await page.evaluate(async (login) => {
            let api = new GeotabApi(login, { rememberMe: false });
            // Puppeteer doesn't like waiting for callbacks.
            // Using a promise to make it wait
            let sessionPromise = new Promise((resolve, reject) => {
                try {
                    api.getSession((session) => {
                        resolve(session);
                    });
                } catch (err) {
                    reject(err);
                }
            });

            // Awaiting the session promise to ensure we get the response
            let auth = await sessionPromise.then(session => session)
                .catch(error => error);
            return auth;
        }, mocks.login);

        assert.isTrue(auth.credentials.database === 'testDB', 'Credentials not properly received');
        assert.equal(auth.path, 'www.myaddin.com', 'Server is not matching expected output');
    });

    it('Api should successfully run getSession (async)', async () => {
        let [credentials, server] = await page.evaluate(async (login) => {
            let api = new GeotabApi(login, { rememberMe: false })

            let credentials, server;
            await api.getSession()
                .then(response => {
                    // Response should have a .then appended in the api to add the server
                    // to the result
                    credentials = response.credentials;
                    server = response.path;
                })
                .catch(err => console.log(err));
            return [credentials, server];
        }, mocks.login);

        assert.isObject(credentials, 'Credentials not properly received');
        assert.equal(server, 'www.myaddin.com', 'Server is not matching expected output');
    });

    it('Api should run multicall (callback)', async () => {
        let result = await page.evaluate(async (login) => {
            let api = new GeotabApi(login, { rememberMe: false })

            let getPromise = new Promise((resolve, reject) => {
                let calls = [
                    ["GetCountOf", { typeName: "Device" }],
                    ["GetCountOf", { typeName: "User" }]
                ];
                api.multiCall(calls, function (result) {
                    resolve(result);
                }, function (error) {
                    reject(error);
                });
            });

            let result = await getPromise
                .then(response => response)
                .catch(err => console.log(err));
            return result;
        }, mocks.login);
        assert.isTrue(result.length === 2, 'Multi-call request did not return a result');
    })

    it('Api should run mutlicall (async)', async () => {
        let result = await page.evaluate(async (login) => {
            let api = new GeotabApi(login, { rememberMe: false })

            let calls = [
                ["GetCountOf", { typeName: "Device" }],
                ["GetCountOf", { typeName: "User" }]
            ];

            let response;
            let multicall = api.multiCall(calls);
            // multicall returns a promise
            await multicall.then(result => { response = result; })
                .catch(err => console.log(err));
            return response;
        }, mocks.login);

        assert.isTrue(result.length === 2, 'Multicall not returning expected array');
    })

    it('Api should run forget', async () => {
        let result = await page.evaluate(async (login) => {
            let api = new GeotabApi(login, { rememberMe: true });
            let auth1 = await api.getSession().then(response => response.credentials.sessionId);
            let auth2 = await api.forget().then(response => response.credentials.sessionId);
            return [auth1, auth2];
        }, mocks.login);
        assert.isFalse(result[0] === result[1], 'Session ID\'s are the same');
    });

    it('Api rememberMe should function properly', async () => {
        let result = await page.evaluate(async (login) => {
            let api1 = new GeotabApi(login, { rememberMe: true });
            let api2 = new GeotabApi(login, { rememberMe: true });
            let sess1 = await api1.getSession()
                .then(response => response.sessionId)
                .catch(err => console.log(err));
            let sess2 = await api2.getSession()
                .then(response => response.sessionId)
                .catch(err => console.log(err));
            return [sess1, sess2];
        }, mocks.login);
        assert.isTrue(result[0] === result[1], 'Session IDs do not match');
    });
    //#region Test to fail
    it('Should return errors with incorrect credentials', async () => {
        let result = await page.evaluate(async () => {
            let api = new GeotabApi({
                credentials: {
                    database: 'badinfo',
                    username: 'badinfo',
                    password: 'badinfo'
                },
                path: 'badinfo',
            }, { rememberMe: false });
            let callResult = await api.call('Get', { typeName: 'Devices' })
                .then(result => result)
                .catch(err => err);
            // Puppeteer doesn't like returning objects
            return callResult.toString();
        });
        assert.isTrue(result.includes('InvalidUserException'), 'Given credentials accepted as valid');
    });

    it('Api should gracefully handle call errors', async () => {

        let result = await page.evaluate(async (login) => {
            let apiError;
            login.error = (err) => apiError = err;
            let api = new GeotabApi(login, { rememberMe: false });
            let getPromise = new Promise((resolve, reject) => {
                let response;
                // Malformed call
                api.call('Geet', { typeName: 'Device' }, function (result) {
                    response = result;
                }, function (error) {
                    reject(error);
                });

                let attempts = 0;
                setInterval(() => {
                    attempts++;
                    if (typeof response !== 'undefined') {
                        resolve(response);
                    }
                    if (typeof apiError !== 'undefined') {
                        reject(apiError);
                    }
                    if (attempts === 500) {
                        reject('authentication never resolves');
                    }
                }, 5);
            });

            let result = await getPromise
                .then(response => response)
                .catch(err => err);
            return result;
        }, mocks.login);
        assert.isTrue(result.includes('MissingMethodException'), 'API does not fail on malformed calls');
    });
    //#endregion
    it('Should return axios response objects', async () => {
        let results = await page.evaluate(async (login) => {
            let api = new GeotabApi(login, { fullResponse: true });
            let calls = [["GetCountOf", { typeName: "Device" }], ["GetCountOf", { typeName: "User" }]];
            // Puppeteer doesn't like returning objects - convert to strings
            let authenticate = JSON.stringify(await api.authenticate());
            let call = JSON.stringify(await api.call('Get', { typeName: 'Device' }));
            let multicall = JSON.stringify(await api.multiCall(calls));
            let forget = JSON.stringify(await api.forget());
            let getSession = JSON.stringify(await api.getSession());
            return [authenticate, call, multicall, forget, getSession]
        }, mocks.login);

        results = results.map(result => JSON.parse(result));
        results.forEach(result => {
            assert.isTrue(typeof result.data.result === 'object', 'Result not defined');
        });
    });

    after(async () => {
        browser.close();
    });
});
