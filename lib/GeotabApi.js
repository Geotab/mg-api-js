const { AxiosError } = require('axios');

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
     * @param {Object} authentication Holds credentials: {
     *                                  userName: '',
     *                                  password/sessionId: '',
     *                                  database: ''
     *                              }
*                                  path: '',
     * @param {*} newOptions overrides default options
     */
    constructor(authentication, newOptions = {}) {
        this._helper = new ApiHelper(authentication, newOptions);
        // Because we send the authenticate method to the helper, we bind it's context here
        this.authenticate = this.authenticate.bind(this);
    }

    /**
 * Authenticates the user against the server. Gets the sessionId and other relevant session information
 *
 * @param {function} callbackSuccess optional callback for successful authentications
 * @param {function} callbackError optional callback for unsuccessful authentications
 * @returns {promise} Call promise - result will be either response.data.error or response.data.result
 */
    async authenticate(callbackSuccess, callbackError) {
        if (callbackSuccess && !callbackError) {
            throw new Error(`If callbackSuccess is supplied so must callbackError`);
        }
        // We will never authenticate with a sessionID. Authentication provides the sessionId
        let options = {
            database: this._helper.database,
            userName: this._helper.userName,
            password: this._helper.password
        }
        let result = this.callimpl('Authenticate', options, callbackSuccess, callbackError);

        if (!callbackSuccess && !callbackError) {
            return result;
        }

    }

    /**
  * Constructs an API call to MyGeotab
  *
  * @param {string} method method name for the API call
  * @param {Object} params method's parameters
  * @param {function} callbackSuccess Optional callback for successful calls
  * @param {function} callbackError Optional callback for unsuccessful calls
  * @returns {promise} an axios promise which will resolve to either data.error or data.result
  */
    async call(method, params, callbackSuccess, callbackError) {
        if (callbackSuccess && !callbackError) {
            throw new Error(`If callbackSuccess is supplied so must callbackError`);
        }

        let result = this.callimpl(method, params, callbackSuccess, callbackError);

        if (!callbackSuccess && !callbackError) {
            return result;
        }
    }

    /**
     * Constructs an API call to MyGeotab
     *
     * @param {string} method method name for the API call
     * @param {Object} params method's parameters
     * @param {function} callbackSuccess Optional callback for successful calls
     * @param {function} callbackError Optional callback for unsuccessful calls
     * @returns {promise} an axios promise which will resolve to either data.error or data.result
     */
    async callimpl(method, params, callbackSuccess, callbackError) {
        // Defining our credentials
        if (this._helper.sessionId) {
            params.credentials = {
                database: this._helper.database,
                sessionId: this._helper.sessionId,
                userName: this._helper.userName
            }
        } else if (this._helper.rememberMe && method !== 'Authenticate' && !this._helper.sessionId) {
            // Check store for credentials
            let storedCredentials = await this._helper.getLocalCredentials();
            if (storedCredentials) {
                params.credentials = storedCredentials;
            } else {
                // Send auth request if no store
                await this._helper.getAuthentication(this.authenticate, this._helper.rememberMe)
                    .then(auth => {
                        params.credentials = auth;
                    });
            }
            // assign credentials with session ID from local storage
        } else if (method !== 'Authenticate' && !this._helper.rememberMe && !this._helper.sessionId) {
            // Needs primary authentication
            await this._helper.getAuthentication(this.authenticate, this._helper.rememberMe)
                .then(auth => {
                    params.credentials = auth;
                });
        }
        // Creating the actual call
        let call = this._helper.sendAxiosCall(method, params, callbackSuccess, callbackError, this.authenticate, this._helper.rememberMe);
        // Seeing if the user wants the axios response object, or default error handling
        if (!this._helper.fullResponse) {
            call = this._helper.errorHandle(call, callbackError);
            call = this._helper.parseAxiosResponse(call);
        }
        // Returning call to user
        return call;
    }

    /**
     *  Constructs a multicall to myGeotab
     *
     * @param {array} calls array of calls to be included in the multicall
     * @param {function} callbackSuccess optional callback function for successful multicalls
     * @param {function} callbackError optional callback function for unsuccessful multicalls
     * @returns {promise} returns call promise
     */
    async multiCall(calls, callbackSuccess, callbackError) {
        if (callbackSuccess && !callbackError) {
            throw new Error(`If callbackSuccess is supplied so must callbackError`);
        }
        let formattedCalls = calls.map(call => {
            let params = call[1];
            return {
                method: call[0],
                params: params
            }
        });


        let result = this.callimpl('ExecuteMultiCall', {
            calls: formattedCalls
        }, callbackSuccess, callbackError);

        if (!callbackSuccess && !callbackError) {
            return result;
        }
    }

    /**
     * Gets a stored or new session
     * @param {function} callbackSuccess optional callback for successes
     * @param {boolean} newSession override any stored credentials and fetch a new session
     * @returns {promise} returns call promise
     */
    async getSession(callbackSuccess, newSession) {
        let cred = await this._helper.getLocalCredentials();
        let response;
        if (!newSession && this._helper.rememberMe) {
            // If we have a stored session
            if (cred) {
                response = this._helper.fullResponse ? { data: { result: { credentials: cred, path: this._helper.server } } } : { credentials: cred, path: this._helper.server };
                if (callbackSuccess) {
                    // New behavior -> Just returning the result
                    if (callbackSuccess.length === 1) {
                        callbackSuccess(response);
                    } else if (callbackSuccess.length === 2) {
                        // Legacy behavior -> Return path and credentials
                        callbackSuccess(cred.credentials, this._helper.server);
                    }
                    return;
                } else {
                    return response;
                }
            } else {
                return this.authenticate(callbackSuccess);
            }
            // Grabbing new credentials
        } else {
            cred = this.authenticate();
            if (callbackSuccess) {
                cred = await cred.then(response => this._helper.fullResponse ? response.data.result.credentials : response);
                response = this._helper.fullResponse ? { data: { result: { credentials: cred, path: this._helper.server } } } : { credentials: cred.credentials, path: this._helper.server };
                if (callbackSuccess.length === 1) {
                    callbackSuccess(response);
                } else if (callbackSuccess.length === 2) {
                    // Legacy getSession asks for credentials and server
                    callbackSuccess(cred.credentials, this._helper.server);
                }
            } else {
                return cred;
            }
        }
    }

    /**
     * Forgets the session in local storage
     * Resets session with already provided credentials
     */
    async forget() {
        this._helper.clearLocalCredentials();
        return this.authenticate();
    }
}

exports.default = GeotabApi;
