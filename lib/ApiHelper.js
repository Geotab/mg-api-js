const LocalStorageCredentialStore = require('./LocalStorageCredentialStore.js').default;
const LocalStorageMock = require('./LocalStorageMock.js').default;
const AxiosCall = require('./AxiosCall.js').default;
const regeneratorRuntime = require('regenerator-runtime'); 

class ApiHelper {

    constructor(server){
        this.credentialStore;
        this.server = server;
        this.cred;
    }

    createStore(newStore){
        this.credentialStore = newStore || new LocalStorageCredentialStore();
    }

    getLocalCredentials(){
        let store = this.credentialStore.get();
        if(store){
            this.server = store.server;
            return store.credentials;
        }
        return store;
    }

    setLocalCredentials(result){
        this.credentialStore.set(result.credentials, result.server);
    }

    clearLocalCredentials(){
        this.credentialStore.clear();
    }

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
                    this.helper.setLocalCredentials(data.result);
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
                this.setLocalCredentials(response.data.result);
            })
        }
        return call;
    }
}

exports.default = ApiHelper;