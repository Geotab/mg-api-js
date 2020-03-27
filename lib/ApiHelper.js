const LocalStorageCredentialStore = require('./LocalStorageCredentialStore.js').default;
const AxiosCall = require('./AxiosCall.js').default;

/**
 * Helper method for GeotabApi.
 * Allows logic to remain somewhat encapsulated from the user
 */
class ApiHelper {

    constructor(credentials, options){
        this.options = {
            rememberMe: options.rememberMe || true,
            debug: options.debug || false,
            timeout: options.timeout || 0,
            newCredentialStore: options.newCredentialStore || false
        }
        this.credentialStore = this.createStore(options.newCredentialStore);
        this.cred = credentials;
    }

    /**
     * Getters/Setters
     *  Helps reduce code when calling from GeotabApi
     */
    get sessionId(){
        return this.cred.sessionId;
    }

    get database(){
        return this.cred.database;
    }

    get userName(){
        return this.cred.userName;
    }

    get password(){
        return this.cred.password;
    }

    get server(){
        return this.cred.server;
    }

    set server(server){
        if(this.options.rememberMe){
            this.credentialStore.set(null, server);
        }
    }

    get rememberMe(){
        return this.options.rememberMe;
    }
    /**
     * Creates the credentialStore. Either an object provided by the user,
     *      created as a mock localStorage object (node) or a reference to
     *      the actual localStorage (browser)
     * @param {object} newStore an Override credentialStore
     */
    createStore(newStore){
        return newStore || new LocalStorageCredentialStore();
    }

    /**
     * checks the credentialStore for stored credentials
     * @returns false if no store, credentials object if there are credentials
     */
    getLocalCredentials(){
        let store = this.credentialStore.get();
        if(store){
            if(store.server){
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
    setLocalCredentials(result, server){
        this.credentialStore.set(result.credentials, server);
    }

    clearLocalCredentials(){
        this.credentialStore.clear();
    }

    /**
     * 
     * @param {function} authenticate API authentication method - context binded to GeotabApi
     * @param {function} callbackError optional callback error for unsuccessful authentications
     * @param {boolean} rememberMe stores authentication once received
     */
    async getAuthentication(authenticate, callbackError, rememberMe){
        let credentials;
        let authFailed;
        let failMessage;
        let reply = {}
        await authenticate().then( response => {
            data = response.data;
            // Successful authentication
            if(data.result){
                if(rememberMe){
                    this.setLocalCredentials(data.result);
                }
                credentials = data.result.credentials;
                if(data.result.path !== 'ThisServer'){
                    this.server = data.result.path;
                }
            } else {
                // Authentication error
                if(callbackError){
                    callbackError(data.error);
                }
                authFailed = true;
                failMessage = data.error;
            }
        });
        if(authFailed){
            reply.error = failMessage;
        } else {
            reply.result = {
                credentials: credentials,
            }
        }
        return reply;
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
    async sendAxiosCall(method, params, callbackSuccess, callbackError, authenticate, rememberMe){
        let call = new AxiosCall(method, this.server, params, callbackSuccess, callbackError).send();
        // We don't want to continue retrying if we fail authentication
        if(method !== 'Authenticate'){
            call.then(async response => {
                let data = response.data;
                // Checking for a failed authentication
                if(data.error){
                    if(data.error.name === 'InvalidUserException'){
                        // Doesn't hurt to clear even if we're not remembering/storing them
                        this.clearLocalCredentials();
                        return authenticate().then( response => {
                            data = response.data;
                            // Successful authentication
                            if(data.result){
                                if(rememberMe){
                                    this.setLocalCredentials(data.result);
                                }
                                params.credentials = data.result.credentials;
                                if(data.result.path !== 'ThisServer'){
                                    this.server = data.result.path;
                                }
                                // Returning a new axios call. No checking for auth errors this time
                                return new AxiosCall(method, this.server, params, callbackSuccess, callbackError)
                            } else {
                                // Authentication error
                                if(callbackError){
                                    callbackError(data.error);
                                }
                                // Let the user know
                                return data;
                            }
                        });
                    }
                } else {
                    return response;
                }
            })
        } else {
            call.then( response => {
                if(response.data.result && this.rememberMe){
                    this.setLocalCredentials(response.data.result, this.server);
                }
            })
        }
        return call;
    }
}

exports.default = ApiHelper;