const ApiHelper = require('./ApiHelper.js').default;
const AxiosCall = require('./AxiosCall.js').default;
const regeneratorRuntime = require('regenerator-runtime'); 

/**
 * Entrypoint to API. Separate class is used to expose public
 * methods only to the user (ES6 has no encapsulation)
 */
class GeotabApi {

    /**
     * 
     * @param {Object} credentials Holds credentials: {
     *                                  userName: '',
     *                                  password/sessionId: '',
     *                                  server: '',
     *                                  database: ''
     *                              }
     * @param {*} newOptions overrides default options
     */
    constructor(credentials, newOptions){
        this.helper = new ApiHelper();
        this.server;
        this.cred = credentials;
        this.options = newOptions || {
            rememberMe: true,
            debug: false,
            timeout: 0,
            newCredentialStore: false
        }
        this.helper.createStore(this.options.newCredentialStore);
    }

    async authenticate(successCallback, errorCallback){
        // We will never authenticate with a sessionID
        let options = {
            database: this.cred.database,
            userName: this.cred.userName,
            password: this.cred.password
        }
        let auth = this.call('Authenticate', options, successCallback, errorCallback);
        return auth;
    }

    async call(method, params, callbackSuccess, callbackError) {
        // Check for session Id in the provided credentials
        if(this.cred.sessionId){
            params.credentials = {
                database: this.cred.database,
                sessionId: this.cred.sessionId,
                userName: this.cred.userName
            }
        } else if(this.options.rememberMe){
            let storedCredentials = await this.helper.getLocalCredentials();
            params.credentials = storedCredentials;
            // assign credentials with session ID from local storage
        } else {
            // Needs primary authentication
            let auth = await this.helper.getAuthentication(this.authenticate, callbackError);

            if(auth.error){
                // Call wont be made, just return an error message to user
                return auth;
            } else {
                params.credentials = auth.result.credentials;
            }
        }
        // Sending the actual call
        return this.helper.sendAxiosCall(method, params, callbackSuccess, callbackError, this.authenticate, this.options.rememberMe);
    }

    multiCall() {

    }

    getSession() {

    }

    forget() {

    }

}

exports.default = GeotabApi;