const ApiHelper = require('./ApiHelper.js').default;

/**
 * Entrypoint to API. Separate class is used to expose "public"
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
    constructor(credentials, newOptions = {}){
        this._helper = new ApiHelper(credentials, newOptions);
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
            database: this._helper.database,
            userName: this._helper.userName,
            password: this._helper.password
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
        if(this._helper.sessionId){
            params.credentials = {
                database: this._helper.database,
                sessionId: this._helper.sessionId,
                userName: this._helper.userName
            }
        } else if(this._helper.rememberMe && method !== 'Authenticate'){
            let storedCredentials = await this._helper.getLocalCredentials();
            if(storedCredentials){
                params.credentials = storedCredentials;
            } else {
                let auth = await this._helper.getAuthentication(this.authenticate, callbackError, this._helper.rememberMe);

                if(auth.error){
                    // Call wont be made, just return an error message to user
                    return auth;
                } else {
                    params.credentials = auth.result.credentials;
                } 
            }
            // assign credentials with session ID from local storage
        } else if(method !== 'Authenticate' && !this._helper.rememberMe && !this._helper.sessionId){
            // Needs primary authentication
            let auth = await this._helper.getAuthentication(this.authenticate, callbackError, this._helper.rememberMe);

            if(auth.error){
                // Call wont be made, just return an error message to user
                return auth;
            } else {
                params.credentials = auth.result.credentials;
            }
        }
        // Sending the actual call
        return this._helper.sendAxiosCall(method, params, callbackSuccess, callbackError, this.authenticate, this._helper.rememberMe);
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
        let cred = await this._helper.getLocalCredentials();
        // If we have a stored session
        if(!newSession && this._helper.rememberMe){
            if(cred){
                if(callbackSuccess){
                    callbackSuccess(cred, this._helper.server);
                    return;
                } else {
                    // Despite not making a call, the response should still be consistent
                    let response = {
                        data: {
                            result: {
                                credentials: cred,
                                path: this._helper.server
                            }
                        }
                    };
                    return response;
                }
            } else {
                return this.authenticate(callbackSuccess);
            }
        // Grabbing new credentials
        } else {
            cred = this.authenticate(callbackSuccess);
            if(callbackSuccess){
                cred = await cred.then( response => response.data.result.credentials);
                callbackSuccess(cred, this._helper.server);
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
        this._helper.clearLocalCredentials();
        return this.authenticate();
    }
}

exports.default = GeotabApi;