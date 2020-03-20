const LocalStorageCredentialStore = require('./LocalStorageCredentialStore.js').default;
const LocalStorageMock = require('./LocalStorageMock.js').default;
const AxiosCall = require('./AxiosCall.js').default;
const regeneratorRuntime = require('regenerator-runtime'); 

class ApiHelper {

    constructor(){
        this.credentialStore;
        this.server;
    }

    createStore(newStore){
        this.credentialStore = newStore || new LocalStorageCredentialStore();
    }

    async getLocalCredentials(){
        let credentials = this.credentialStore.get();
        this.server = credentials[1]
        return credentials[0];
    }

    setLocalCredentials(result){
        this.credentialStore.set(result.credentials, result.server);
    }

    clearLocalCredentials(){
        this.credentialStore.clear();
    }

    async getAuthentication(authenticate, callbackError){

        credentials;
        authFailed;
        failMessage;
        response = {}

        authenticate().then( response => {
            data = response.data;
            // Successful authentication
            if(data.result){
                if(this.options.rememberMe){
                    this.helper.setLocalCredentials(data.result);
                }
                credentials = data.result.credentials;
                this.server = data.result.path;
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
            response.error = failMessage;
        } else {
            response.result = {
                credentials: credentials,
            }
        }
        return response;
    }

    async sendAxiosCall(method, params, callbackSuccess, callbackError, authenticate, rememberMe){
        return new AxiosCall(method, this.server, params, callbackSuccess, callbackError).send()
                // Catching the first response to see if the session expired
                .then( async result => {
                    // Checking for a failed authentication
                    if(result.data.error.name === 'InvalidUserException'){
                        // Doesn't hurt to clear even if we're not remembering/storing them
                        this.clearLocalCredentials();
                        return await authenticate().then( response => {
                            data = response.data;
                            // Successful authentication
                            if(data.result){
                                if(rememberMe){
                                    this.setLocalCredentials(data.result);
                                }
                                params.credentials = data.result.credentials;
                                this.server = data.result.path;
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
                });
    }
}

exports.default = ApiHelper;