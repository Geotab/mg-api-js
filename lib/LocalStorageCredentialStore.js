const LocalStorageMock = require('./LocalStorageMock').default;

class LocalStorageCredentialStore {
    constructor(){
        this.credentials_key = 'geotabAPI_credentials';
        this.server_key = 'geotabAPI_server';

        if (typeof localStorage === 'undefined' || localStorage === null) {
            // Mocking local storage for nodeJS implementation. 
            this.localStorage = new LocalStorageMock();
        } else {
            this.localStorage = localStorage;
        }
    }

    get() {
        let storedCredentials   = this.localStorage.getItem(this.credentials_key);
        let storedServer        = this.localStorage.getItem(this.server_key);
        let thisCredentials     = false;

        if (storedCredentials && storedServer) {
            try {
                thisCredentials = {
                    credentials: JSON.parse(storedCredentials),
                    server: storedServer
                }
            } catch (e) {
                // Malformed JSON
                return false;
            }
        }
        return thisCredentials;
    }

    set(credentials, server) {
        this.localStorage.setItem(this.credentials_key, JSON.stringify(credentials));
        this.localStorage.setItem(this.server_key, server);
    }

    clear() {
        this.localStorage.removeItem(this.credentials_key);
        this.localStorage.removeItem(this.server_key);
    }
}

exports.default = LocalStorageCredentialStore;