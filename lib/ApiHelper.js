const LocalStorageCredentialStore = require('./LocalStorageCredentialStore.js').default;
const AxiosCall = require('./AxiosCall.js').default;

/**
 * Helper method for GeotabApi.
 * Allows logic to remain somewhat encapsulated from the user
 */
class ApiHelper {

    constructor(authentication, options) {
        if (typeof authentication !== 'object') {
            throw new Error('authentication object not provided - must provide an authentication object to instantiate GeotabApi');
        }
        this.options = {
            fullResponse: typeof options.fullResponse === 'undefined' ? false : options.fullResponse,
            rememberMe: typeof options.rememberMe === 'undefined' ? true : options.rememberMe,
            timeout: typeof options.timeout === 'undefined' ? 180 : options.timeout,
            newCredentialStore: typeof options.newCredentialStore === 'undefined' ? false : options.newCredentialStore
        }
        this.credentialStore = this.createStore(options.newCredentialStore);
        if (authentication.credentials.sessionId) {
            // Throwing an error if path isn't provided when using sessionID
            if (typeof authentication.path === 'undefined') {
                throw new Error('Path not provided - Must provide server path if providing sessionId in authentication object');
            }
            if (this.options.rememberMe) {
                this.credentialStore.set(authentication.credentials, authentication.path);
            }
        }
        this.cred = authentication.credentials;
        this.server = authentication.path;
    }

    /**
     * Getters/Setters
     *  Helps reduce code when calling from GeotabApi
     */
    get sessionId() {
        return this.cred.sessionId;
    }

    get database() {
        return this.cred.database;
    }

    get userName() {
        return this.cred.userName;
    }

    get password() {
        return this.cred.password;
    }

    get rememberMe() {
        return this.options.rememberMe;
    }

    get fullResponse() {
        return this.options.fullResponse;
    }

    /**
     * Creates the credentialStore. Either an object provided by the user,
     *      created as a mock localStorage object (node) or a reference to
     *      the actual localStorage (browser)
     * @param {object} newStore an Override credentialStore
     */
    createStore(newStore) {
        return newStore || new LocalStorageCredentialStore();
    }

    /**
     * checks the credentialStore for stored credentials
     * @returns false if no store, credentials object if there are credentials
     */
    getLocalCredentials() {
        let store = this.credentialStore.get();
        if (store) {
            if (store.server) {
                this.server = store.server;
            }
            return store.credentials;
        }
        return store;
    }

    /**
     * Sets the local credentials
     * @param {object} result credentials object using result of a promise
     */
    setLocalCredentials(result, server) {
        this.credentialStore.set(result.credentials, server);
    }

    clearLocalCredentials() {
        this.credentialStore.clear();
    }

    /**
     * Gets and stores authentication response using GeotabApi.authenticate()
     * @param {function} authenticate API authentication method - context binded to GeotabApi
     * @param {function} callbackError optional callback error for unsuccessful authentications
     * @param {boolean} rememberMe stores authentication once received
     */
    async getAuthentication(authenticate, rememberMe) {
        return authenticate().then(response => {
            // Response changes based on error handling.
            let data = response.data ? response.data.result : response;
            if (data.path !== 'ThisServer') {
                this.server = data.path;
            }
            // Successful authentication
            if (rememberMe) {
                this.setLocalCredentials(data.credentials, this.server);
            }
            this.cred.sessionId = data.credentials.sessionId;
            return data.credentials;
        });
    }

    /**
     * When the user doesn't have fullResposne enabled, we put some promises in front of the call
     * to return only data.result to the user
     * @param {Promise} call Axios call
     */
    parseAxiosResponse(call) {
        return call
            .then(response => {
                // Error handling has already taken errors out in either errorHandle() or AxiosCall.send()
                if (response.data.result) {
                    return response.data.result;
                }
                return response;
            });
    }

    /**
     * Error handling - only called if fullresponse isn't enabled, and if the user hasn't provided a callback
     * @param {Promise} call Axios call
     * @param {function} callbackError Optional callback for unsuccessful calls
     */
    errorHandle(call, callbackError) {
        // User hasn't asked for the full axios object, so we should error check
        return call
            .then(response => {
                if (response.status !== 200) {
                    let error = new Error(`Response ${response.status} - ${response.statusText}`);

                    if (callbackError) {
                        callbackError(error.toString(), error);
                    } else {
                        throw error;
                    }
                }
                return response;
            })
            .then(response => {
                if (response.data.error) {
                    let error = new Error(`${response.data.error.data.type}: ${response.data.error.message}`);

                    if (callbackError) {
                        callbackError(error.toString(), response.data.error);
                    } else {
                        throw error;
                    }
                }
                return response;
            });
    }

    /**
     * Creates a new AxiosCall and returns it to the user. If the call fails,
     *      and the call isn't an authentication, the call will attempt to
     *      refresh the credentials
     *
     * @param {string} method method name for the API call
     * @param {Object} params method's parameters
     * @param {function} callbackSuccess Optional callback for successful calls
     * @param {function} callbackError Optional callback for unsuccessful calls
     * @param {function} authenticate authentication function. Context binded to GeotabApi
     * @param {boolean} rememberMe should store authentication results
     */
    async sendAxiosCall(method, params, callbackSuccess, callbackError, authenticate, rememberMe) {
        let call = new AxiosCall(method, this.server, params, callbackSuccess).send(this.options.timeout);
        // We don't want to continue retrying if we fail authentication
        if (method !== 'Authenticate') {
            call = call.then(async response => {
                let data = response.data;
                // Checking for a failed authentication
                if (data.error) {
                    if (data.error.data.type === 'InvalidUserException') {
                        // Doesn't hurt to clear even if we're not remembering/storing them
                        this.clearLocalCredentials();
                        // Assuming there was a session timeout, re-running authentication
                        await this.getAuthentication(authenticate, rememberMe)
                            .then(auth => {
                                params.credentials = auth;
                            });
                        return new AxiosCall(method, this.server, params, callbackSuccess).send(this.options.timeout);
                    }
                }
                return response;
            })
        } else {
            call = call.then(response => {
                if (response.data.result) {
                    let server = response.data.result.path === 'ThisServer' ? this.server : response.data.result.path;
                    this.server = server;
                    if (this.rememberMe) {
                        this.setLocalCredentials(response.data.result, server);
                    }
                }
                return response;
            });
        }
        return call;
    }
}

exports.default = ApiHelper;
