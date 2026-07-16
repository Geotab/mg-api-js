![Node.js CI](https://github.com/Geotab/mg-api-js/workflows/Node.js%20CI/badge.svg?branch=master)

# mg-api-js

A MyGeotab API wrapper for both clientside JavaScript and NodeJS

## Installation

### NodeJS

```javascript
$ npm install --save mg-api-js
```

### Browser

To use the wrapper in a browser, download `dist/api.min.js` from a release or load an exact version from jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/npm/mg-api-js@3.0.3/dist/api.min.js"></script>
```

Pin both the package version and file path in production. An unversioned CDN URL can change when a new release is published, so upgrades should be reviewed and deployed deliberately. For other URL formats, see the [jsDelivr documentation](https://www.jsdelivr.com/features).

## Creating the Object
**Note**: *As of v2.0.0, the GeotabApi object no longer accepts an authentication callback.*

```javascript
const GeotabApi = require('mg-api-js');
const api = new GeotabApi(authentication[, options]);
```

Credentials are provided to the wrapper in an authentication object. The authentication object is required to successfully create a GeotabApi object, and must conform to one of the following structures:

### Authentication (Object)

#### With Password

If you are connecting with the wrapper for the first time, you must pass a username/password combo of a user on the database you are trying to connect to.

```javascript
const authentication = {
    credentials: {
        database: 'database',
        userName: 'username',
        password: 'password'
    },
    path: 'serverAddress'
}
```
> If you do not know the exact server address this can be omitted when using a password, and will route the initial authentication to `my.geotab.com`.

#### With SessionId

If you already have a session, you can pass in the SessionId, and the wrapper will attempt to authenticate using this first.

```javascript
const authentication = {
    credentials: {
        database: 'database',
        userName: 'username',
        sessionId: '123456...'
    },
    path: 'serverAddress'
}
```
> If using sessionId, you are required to provide the server path.

> A session is valid for up to 14 days.

### Options *(optional)*

This optional parameter allows you to define some default behavior of the api:

| Argument | Type | Description | Default |
| --- | --- | --- | --- |
| rememberMe | *boolean* | Determines whether authenticated credentials are persisted in the credential store | `true` |
| timeout | *number* | The length of time the wrapper will wait for a response from the server (in seconds) | `180` |
| newCredentialStore | *object* | Uses a custom synchronous credential store instead of the default store | `false` |
| fullResponse | *boolean* | Removes error handling and provides the full [Http Server Response](https://nodejs.org/api/http.html#class-httpserverresponse) when in a node environment or the full [Fetch Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) when in a browser environment. More information in the **Full Response** section | `false` |

Example options object: 

```javascript
const dataStore = new YourDefinedDataStore();

const options = {
    rememberMe: true,
    timeout: 10,
    newCredentialStore: dataStore
}
```

#### Credential persistence and threat model

With the default `rememberMe: true`, browsers store the authenticated credential object as plaintext JSON in same-origin [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). This normally contains a session ID, user name, and database; if you provide a session credential object containing other secrets, those values are stored too. The Node.js default is an in-memory `LocalStorageMock` and does not persist across processes.

A stored session ID is a bearer credential. Any script executing on the same origin can read it, including code introduced through cross-site scripting (XSS) or a compromised third-party dependency. Browser extensions, shared browser profiles, and local device access may also expose it. Applications using the default store should apply normal XSS and dependency-supply-chain defenses.

Use `rememberMe: false` when persistent browser sessions are not required or the application cannot accept this risk. This prevents newly authenticated credentials from being written, but it does **not** remove credentials saved by an earlier instance. Clear the custom store during logout or migration. When using the default browser store, remove the `geotabAPI_credentials` and `geotabAPI_server` localStorage entries.

`api.forget()` is a session-refresh helper, not a logout operation: it clears the store, immediately authenticates again, and can persist the replacement session when `rememberMe` is enabled.

#### Providing a custom credential store

The supported `newCredentialStore` option accepts a synchronous object with this interface:

- `get()` returns `false`, `null`, or `{ credentials, server }`.
- `set(credentials, server)` stores the supplied credential object and server name.
- `clear()` removes the stored values.

For example, this memory-only store shares credentials between API instances without writing them to `localStorage`:

```javascript
class MemoryCredentialStore {
    constructor() {
        this.value = false;
    }

    get() {
        return this.value;
    }

    set(credentials, server) {
        this.value = { credentials, server };
    }

    clear() {
        this.value = false;
    }
}

const credentialStore = new MemoryCredentialStore();
const options = {
    rememberMe: true,
    newCredentialStore: credentialStore
};

const api = new GeotabApi(authentication, options);
// On logout, discard the API instance and clear the application-owned store.
credentialStore.clear();
```

A custom store can integrate with an application-controlled credential broker or provide memory-only behavior. Encryption whose key is available to the same page JavaScript does not protect credentials from malicious same-origin scripts, because those scripts can invoke the store or read credentials after retrieval.

## Methods

By default, all methods and callbacks will return the results of the call directly. Errors are also handled by the wrapper. If you need more control over the call results, see the **Full Response** section below.

```javascript
api.call('Get', { typeName: 'Device', resultsLimit: 100 })
    .then( result => {
        // Result is the information returned by the server. In this case, it's the 100 devices.
        console.log(result);
    })
    .catch( error => {
        // some form of error occured with the request
        console.log(error);
    });
```

Using callbacks will allow you to pass in your own logic to be executed when the call is complete. The standard pattern for success callback is as follows:

```javascript
function callbackSuccess(result){
    //Your response logic
    console.log(result);
}
```

Error callbacks have two parameters: `message` and `error`. `message` is a condensed `string` form of `error` for convience. In the case of a non-200 status code failure, `error` is an instance of `Error`. In all other cases, it is the full error JSON returned from the API call. 

```javascript
function callbackError(message, error){
    //Your response logic
    console.log(message);
    console.log(error.data);
}
```
For more information on the error JSON structure returned from MyGeotab API, see [here](https://developers.geotab.com/myGeotab/guides/concepts#result-and-errors).

Note: `error` parameter in a `.catch` statement always returns an instance of `Error`. 

### Authentication

The api by default will authenticate when the first call is run. However, if you want to expedite the process, you can use the authenticate method with promises or callbacks:

```javascript
const api = new GeotabApi(authentication);
await api.authenticate().then( response => console.log('I have authenticated'));
// OR
api.authenticate( success => {
    console.log('Successful authentication');
}, (message, error) => {
    console.log('Something went wrong');
});
```

### Call

#### Promises

Make a request to the database and receive a promise
```javascript
let myCall = api.call('Get', {
    typeName: 'Device',
    resultsLimit: 1
});

myCall.then( data => console.log(`Server response data: ${data}`))
      .catch( error => console.log(error));
```

#### Callbacks

Make a request to the database by providing a success/error callback

```javascript
api.call('Get', {
    typeName: 'Device',
    resultsLimit: 1
}, function (result) {
    if (result) {
        console.log(result);
    }
}, function (message, err) {
    console.error(err);
});
```

### MultiCall

Perform multiple queries against the database in a single HTTPS request 

#### Promises

```javascript
let calls = [
    ['Get', { typeName: 'Device', resultsLimit: 1 }],
    ['Get', { typeName: 'User', resultsLimit: 1 }]
];
let myMultiCall = api.multiCall(calls);

myMultiCall.then(data => console.log(`Server response: ${data}`))
           .catch(error => console.log(error));
```

#### Callbacks

```javascript
api.multiCall([
    ['Get', {
    typeName: 'Device',
    resultsLimit: 1
}],['Get', {
    typeName: 'User',
    resultsLimit: 1
}]
], function (result) {
    if (result) {
        console.log(result);
    }
}, function (message, err) {
    console.error(err);
});
```

### Forget

Clears credentials and the credential store.

```javascript
api.forget();
```

#### Promises

Forget also allows a promise to be returned. By default this returns a fresh set of credentials

```javascript
let myForgetCall = api.forget();

myForgetCall.then(data => console.log(`Server response: ${data}`))
            .catch(error => console.log(error));
```

### GetSession
Retrieves the API user session. Returns the credentials and server.

#### Promises

```javascript
let mySession = api.getSession();
mySession.then(data => console.log(`Server response: ${data}`))
         .catch(error => console.log(error));
```

#### Callbacks

```javascript
api.getSession(function (result) {
    console.log(result.credentials, result.path);
});
```

## Full Responses
**Note:** *This will disable all error checking in the GeotabApi wrapper*
In an effort to give you more control over the actual responses, the wrapper can be configured to return the full [Http Server Response](https://nodejs.org/api/http.html#class-httpserverresponse) when in a node environment and the full [Fetch Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) when in a browser environment. This object contains several bits of information about the request and it's response. Response data will be held in the `data` section of the response.

To enable full response data, simply add the `fullResponse: true` to the options object when constructing the `GeotabApi` object:
```javascript
const GeotabApi = require('mg-api-js');
const opts = {
    fullResponse: true
}
const api = new GeotabApi(authentication, opts);
```

If the call to the database is successful, but there is an error with the call itself, the server will return an error object that contains specifics about what went wrong.:

```javascript
api.call('Get', {typeName: 'Device', resultsLimit: 10})
    .then( response => response.data ) // response is the full http/fetch response object
    .then( data => {
        // This is the server response
        data.result; // The successful Call - device information
        data.error // Unsuccessful Call - error information
    })
    .catch( err => console.log(err) );
```

## Breaking Changes

As of v2.0.0, there are several noteable changes that will cause previous implementations of the api wrapper to fail.

As of v3.0.0, Axios is no longer being used to make requests and the `fullResponse` option no longer returns an [Axios Response Object](https://github.com/axios/axios#response-schema), refer to the **Full Response** section for more detail.

#### GeotabApi credential callback

Using a credentials callback to instantiate `GeotabApi` is no longer an option. All credentials must be passed as an authentication object described above

#### JSONP

JSONP is no longer supported both as a function and as an argument in the options parameter

