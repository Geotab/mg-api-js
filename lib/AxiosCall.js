const axios = require('axios');

class AxiosCall {

    constructor(method, server, params, callbackSuccess) {
        this.config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }
        this.callbackSuccess = callbackSuccess;
        this.server = server;
        this.body = {
            method: method || '',
            params: params
        };
    }

    getCallUrl() {
        let server = this.server || 'my.geotab.com';
        let thisServer = server.replace(/\S*:\/\//, '').replace(/\/$/, '');
        return 'https://' + thisServer + '/apiv1/';
    }

    encode(data) {
        let stringBody = JSON.stringify({
            method: data.method || '',
            params: data.params
        })
        return stringBody;
    }

    /**
     * Sends axios request
     * @param {int} timeout amount in milliseconds for timeout.
     *                      options.timeout * 1000 is a good start
     *                      Defaults to no timeout (0)
     * @returns {Promise} Axios promise
     */
    async send(timeout) {
        this.request = axios({
            method: 'POST',
            url: this.getCallUrl(),
            data: this.encode(this.body),
            headers: this.config.headers,
            timeout: timeout * 1000
        });
        // Normal callback behaviour if we have one
        if (this.callbackSuccess) {
            this.request = this.request
                .then(response => {
                    let data = response.data;
                    if (!data.error) {
                        this.callbackSuccess(data.result);
                    }
                    return response;
                });
        }

        // Returning promise
        return this.request;
    }
}

exports.default = AxiosCall;
