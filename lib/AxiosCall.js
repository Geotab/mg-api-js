const axios = require('axios').default;

class AxiosCall {

    constructor(method, params, callbackSuccess, callbackError){
        this.config = {
            headers: {
              'Content-Type': 'applications/json'
            }
        }
        this.callbackSuccess = callbackSuccess;
        this.callbackError = callbackError;
        this.rpcString;
        try {
            this.rpcString = JSON.stringify({
                method: method || '',
                params: params
            });
        } catch (error){
            // handleError(e, callbackError);
        }
    }

    getCallUrl(method){
        let thisServer = server.replace(/\S*:\/\//, '').replace(/\/$/, '');
        return 'https://' + thisServer + '/apiv1' + (method ? '/' + method : '');
    }  

    /**
     * Sends axios request
     * @param {int} timeout amount in milliseconds for timeout. options.timeout * 1000 is a good start
     *                      Defaults to no timeout (0)
     * @returns {Promise} Axios promise
     */
    send(timeout = 0){
        this.request = axios({
            method: 'POST',
            url: this.getCallUrl(this.rpcString.method),
            data: encodeURIComponent(this.rpcString),
            config: this.config,
            timeout: timeout
        });

        // Normal callback behaviour if we have one
        if (this.callbackSuccess) {
            this.request
                .then(response => {
                    let data = response.data;
                    if (data.error && this.callbackError) {
                        this.callbackError(data.error);
                    } else {
                        this.callbackSuccess(data.result);
                    }
                }
            );
        }

        // If we got a callbackError, we can catch the error and use it
        if(this.callbackError){
            this.request
                .catch( error => {
                    this.callbackError('Request Failure', error);
                }
            );
        }
        // Returning promise
        return this.request;
    }
}

module.exports = AxiosCall;