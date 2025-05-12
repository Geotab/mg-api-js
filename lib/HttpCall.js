const http = typeof window === 'undefined' ? require('http') : null;
const https = typeof window === 'undefined' ? require('https') : null;

class HttpCall {

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
     * Sends http/fetch request depending on environment.
     * @param {int} timeout amount in milliseconds for timeout.
     *                      options.timeout * 1000 is a good start
     *                      Defaults to no timeout (0)
     * @returns {Promise} http/fetch response object wrapped in a promise
     */
    async send(timeout) {
        const url = this.getCallUrl();
        const body = this.encode(this.body);
        const headers = this.config.headers;

        if (typeof window !== 'undefined' && window.fetch) {
            // Web environment (using fetch)
            let fetchTimeout;
            const fetchPromise = fetch(url, {
                method: 'POST',
                headers: headers,
                body: body
            });

            const timeoutPromise = new Promise((_, reject) => {
                fetchTimeout = setTimeout(() => reject(new Error('Request timed out')), timeout * 1000);
            });

            return Promise.race([fetchPromise, timeoutPromise])
                .then(async response => {
                    clearTimeout(fetchTimeout);
                    const data = await response.json();
                    response.data = data;
                    if (this.callbackSuccess && !data.error) {
                        this.callbackSuccess(data.result);
                    }
                    return response;
                })
                .catch(error => {
                    return Promise.reject(error);
                });

        } else {
            // Node.js environment (using http/https)
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname,
                method: 'POST',
                headers: headers,
                timeout: timeout * 1000
            };

            return new Promise((resolve, reject) => {
                const req = (urlObj.protocol === 'https:' ? https : http).request(options, res => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const parsedData = JSON.parse(data);
                            res.data = parsedData; // Attach parsed response body to the response object.
                            if (this.callbackSuccess && !parsedData.error) {
                                this.callbackSuccess(parsedData.result);
                            }
                            resolve(res);
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timed out'));
                });

                req.write(body);
                req.end();
            });
        }
    }
}

exports.default = HttpCall;
