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

    beforeEach(async () => {
        await page.evaluate(() => localStorage.clear());
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

    it('Api rememberMe should persist a session in localStorage', async () => {
        let result = await page.evaluate(async (login) => {
            let api1 = new GeotabApi(login, { rememberMe: true });
            let session1 = await api1.getSession();
            let api2 = new GeotabApi(login, { rememberMe: true });
            let session2 = await api2.getSession();
            let storedCredentials = JSON.parse(localStorage.getItem('geotabAPI_credentials'));

            return {
                firstSessionId: session1.credentials.sessionId,
                secondSessionId: session2.credentials.sessionId,
                storedSessionId: storedCredentials.sessionId,
                storedServer: localStorage.getItem('geotabAPI_server')
            };
        }, mocks.login);

        assert.isString(result.firstSessionId, 'First session ID is missing');
        assert.equal(result.secondSessionId, result.firstSessionId, 'Stored session ID was not reused');
        assert.equal(result.storedSessionId, result.firstSessionId, 'Session ID was not persisted');
        assert.equal(result.storedServer, mocks.server, 'Server was not persisted');
    });

    it('rememberMe false should not write credentials to localStorage', async () => {
        let result = await page.evaluate(async (login) => {
            let api = new GeotabApi(login, { rememberMe: false });
            let session = await api.getSession();

            return {
                sessionId: session.credentials.sessionId,
                storedCredentials: localStorage.getItem('geotabAPI_credentials'),
                storedServer: localStorage.getItem('geotabAPI_server')
            };
        }, mocks.login);

        assert.isString(result.sessionId, 'Authentication did not return a session ID');
        assert.isNull(result.storedCredentials, 'Credentials were persisted with rememberMe disabled');
        assert.isNull(result.storedServer, 'Server was persisted with rememberMe disabled');
    });

    it('Should support a synchronous custom credential store', async () => {
        let result = await page.evaluate(async (login) => {
            let value = false;
            let calls = { get: 0, set: 0, clear: 0, invalidSet: 0 };
            let store = {
                get() {
                    calls.get++;
                    return value;
                },
                set(credentials, server) {
                    calls.set++;
                    if (!credentials) {
                        calls.invalidSet++;
                    }
                    value = { credentials, server };
                },
                clear() {
                    calls.clear++;
                    value = false;
                }
            };

            let firstLogin = {
                credentials: {
                    database: login.credentials.database,
                    userName: login.credentials.userName,
                    password: login.credentials.password
                },
                path: login.path
            };
            let api1 = new GeotabApi(firstLogin, { rememberMe: true, newCredentialStore: store });
            let session1 = await api1.getSession();
            let secondLogin = {
                credentials: { ...firstLogin.credentials },
                path: 'unused.example'
            };
            let api2 = new GeotabApi(secondLogin, { rememberMe: true, newCredentialStore: store });
            let session2 = await api2.getSession();
            await api2.forget();

            return {
                calls,
                firstSessionId: session1.credentials.sessionId,
                secondSessionId: session2.credentials.sessionId,
                restoredPath: session2.path,
                server: value.server
            };
        }, mocks.login);

        assert.isAtLeast(result.calls.get, 2, 'Custom store was not read');
        assert.isAtLeast(result.calls.set, 1, 'Custom store was not written');
        assert.equal(result.calls.invalidSet, 0, 'Custom store received an empty credential object');
        assert.equal(result.calls.clear, 1, 'Custom store was not cleared by forget');
        assert.equal(result.secondSessionId, result.firstSessionId, 'Custom store session was not reused');
        assert.equal(result.restoredPath, mocks.server, 'Custom store server was not restored');
        assert.equal(result.server, mocks.server, 'Refreshed session was not written with the restored server');
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
    it('Should return fetch response objects', async () => {
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
            assert.isTrue(result.data && typeof result.data.result === 'object', 'Result not defined');
        });
    });

    after(async () => {
        if (browser) {
            await browser.close();
        }
    });
});
