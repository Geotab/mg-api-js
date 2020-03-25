const ApiHelper = require('./ApiHelper.js').default;
const AxiosCall = require('./AxiosCall.js').default;
const regeneratorRuntime = require('regenerator-runtime'); 

/**
 * Entrypoint to API. Separate class is used to expose public
 * methods only to the user - Babel currently doesn't support
 * ES10 access modifiers
 */
class GeotabApi {

    /**
     * Constructor for GeotabApi
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
        this.server = credentials.server;
        this.helper = new ApiHelper(this.server);
        this.cred = credentials;
        this.options = newOptions || {
            rememberMe: true,
            debug: false,
            timeout: 0,
            newCredentialStore: false
        }
        this.helper.createStore(this.options.newCredentialStore);
        // Because we send the authenticate method to the helper, we bind it's context here
        this.authenticate = this.authenticate.bind(this);
    }

    /**
     * Authenticates the user against the server. Gets the sessionId and other relevant session information
     * 
     * @param {function} successCallback optional callback for successful authentications
     * @param {function} errorCallback optional callback for unsuccessful authentications
     * @returns {promise} Call promise - result will be either response.data.error or response.data.result
     */
    async authenticate(successCallback, errorCallback){
        // We will never authenticate with a sessionID. Authentication provides the sessionId
        let options = {
            database: this.cred.database,
            userName: this.cred.userName,
            password: this.cred.password
        }
        let auth = this.call('Authenticate', options, successCallback, errorCallback);
        return auth;
    }

    /**
     * Constructs an API call to MyGeotab
     * 
     * @param {string} method method name for the API call
     * @param {Object} params method's parameters
     * @param {function} callbackSuccess Optional callback for successful calls
     * @param {function} callbackError Optional callback for unsuccessful calls
     * @returns {priomise} an axios promise which will resolve to either data.error or data.result
     */
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
        } else if(method !== 'Authenticate' && !this.options.rememberMe && !this.cred.SessionId){
            // Needs primary authentication
            let auth = await this.helper.getAuthentication(this.authenticate, callbackError, this.options.rememberMe);

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

    /**
     *  Constructs a multicall to myGeotab
     *  
     * @param {array} calls array of calls to be included in the multicall
     * @param {function} callbackSuccess optional callback function for successful multicalls
     * @param {function} callbackError optional callback function for unsuccessful multicalls
     * @returns {promise} returns call promise
     */
    multiCall(calls, callbackSuccess, callbackError) {
        let formattedCalls = calls.map( call => {
            let params = call[1];
            return {
                method: call[0],
                params: params
            }
        });

        return this.call('ExecuteMultiCall', {
            calls: formattedCalls
        }, callbackSuccess, callbackError);
    }

    /**
     * Gets a stored or new session
     * @param {function} callbackSuccess optional callback for successes
     * @param {boolean} newSession override any stored credentials and fetch a new session
     * @returns {promise} returns call promise
     */
    async getSession(callbackSuccess, newSession) {
        let cred = await this.helper.getLocalCredentials();
        // If we have a stored session
        if(!newSession && this.options.rememberMe){
            if(cred){
                if(callbackSuccess){
                    callbackSuccess(cred, this.server);
                    return;
                } else {
                    return {credentials: cred, path: this.server};
                }
            } else {
                return this.authenticate();
            }
        // Grabbing new credentials
        } else {
            cred = this.authenticate();
            if(callbackSuccess){
                cred = await cred.then( response => response.data.result.credentials);
                callbackSuccess(cred, this.server);
            } else {
                return await cred.then( response => response);
            }
        }
    }

    /**
     * Forgets the session in local storage
     * Resets session with already provided
     */
    async forget() {
        this.helper.clearLocalCredentials();
        return this.authenticate();
    }

}

exports.default = GeotabApi;