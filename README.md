![Node.js CI](https://github.com/Geotab/mg-api-js/workflows/Node.js%20CI/badge.svg?branch=master)

# mg-api-js

A MyGeotab API wrapper for both clientside JavaScript and NodeJS

## Installation

### NodeJS

```javascript
$ npm install --save mg-api-js
```

### Browser

To access the wrapper in the browser, the library needs to be loaded in. This can be done by downloading `api.min.js` and referencing the file as needed. 

Alternatively, this can be done using jsdelivr CDN:

```html
<!-- This will grab the most up to date version of the api wrapper -->
<script src="https://cdn.jsdelivr.net/npm/mg-api-js"></script>

<!-- This will grab the specified version of the api wrapper -->
<script src="https://cdn.jsdelivr.net/npm/mg-api-js@2.0.1"></script>
```

For more options using jsdelivr, visit the [jsdelivr documentation](https://www.jsdelivr.com/features).

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
        password: 'password',
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
| rememberMe | *boolean* | Determines whether or not to store the credentials/session in the datastore | `true` |
| timeout | *number* | The length of time the wrapper will wait for a response from the server (in seconds) | `3` |
| newCredentialStore | *object* | Overrides the default datastore for remembered credentials/sessions | `false` |
| fullResponse | *boolean* | Removes error handling and provides full [Axios Response Object](https://github.com/axios/axios#response-schema). More information in the **Axios Response section** | `false` |

Example options object: 

```javascript
const dataStore = new YourDefinedDataStore();

const options = {
    rememberMe: true,
    timeout: 10,
    newCredentialStore: dataStore
}
```

#### Providing your own Datastore

By default, the wrapper will use [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) in browsers, and a [LocalStorageMock](https://github.com/Geotab/mg-api-js/blob/master/lib/LocalStorageMock.js) in node.

If you want to override this behavior, you can provide an instance of a datastore object in the options object when constructing the wrapper.

At minimum, the datastore must have the following methods:
- `get()`
- `set()`
- `clear()`

## Methods

By default, all methods and callbacks will return the results of the call directly. Errors are also handled by the wrapper. If you need more control over the call results, see the **Axios Response** section below.

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
For more information on the error JSON structure returned from MyGeotab API, see [here](https://geotab.github.io/sdk/software/guides/concepts/#results-and-errors).

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

## Axios Responses
**Note:** *This will disable all error checking in the GeotabApi wrapper*
In an effort to give you more control over the actual responses, the wrapper can be configured to return an [Axios Response Object](https://github.com/axios/axios#response-schema). This object contains several bits of information about the request and it's response. Response data will be held in the `data` section of the response.

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
    .then( response => response.data ) // response is the Axios response object
    .then( data => {
        // This is the server response
        data.result; // The successful Call - device information
        data.error // Unsuccessful Call - error information
    })
    .catch( err => console.log(err) );
```

## Breaking Changes

As of v2.0.0, there are several noteable changes that will cause previous implementations of the api wrapper to fail.

#### GeotabApi credential callback

Using a credentials callback to instantiate `GeotabApi` is no longer an option. All credentials must be passed as an authentication object described above

#### JSONP

JSONP is no longer supported both as a function and as an argument in the options parameter

