# mg-api-js

A MyGeotab API wrapper for both clientside javascript and nodeJS

## Installation

```javascript
$ npm install --save mg-api-js
```

## Creating the Object
**Note**: *As of v2.0.0, the GeotabApi object no longer accepts an authentication callback.*

```javascript
const GeotabApi = require('mg-api-js');
const api = new GeotabApi(authentication[, options]);
```

Credentials are provided to the wrapper in an authentication object. The authentication object is required to successfully create a GeotabApi object, and must conform to one of the following structures:

### Authentication (Object)

##### With Password

If you are connecting with the wrapper for the first time, you must pass a username/password combo of a user on the database you are trying to connect to.

```javascript
const authentication = {
    credentials: {
        database: 'database',
        userName: 'username',
        password: 'password'
    }
    path: 'serverAddress',
}
```
**Note** - *If you do not know the exact server address, this can be omitted when using a password, and will route the initial authentication to `my.geotab.com`*.

##### With SessionId

If you already have a session, you can pass in the SessionId, and the wrapper will attempt to authenticate using this first.

```javascript
const authentication = {
    credentials: {
        database: 'database',
        userName: 'username',
        password: 'password',
        sessionId: '123456...'
    }
    path: 'serverAddress',
}
```
**Note** - *If using sessionId, you are required to provide the server path.*

### Options *(optional)*

This optional parameter allows you to define some default behaviour of the api:

| Argument | Type | Description | Default |
| --- | --- | --- | --- |
| rememberMe | *boolean* | Determines whether or not to store the credentials/session in the datastore | `true` |
| timeout | *number* | The length of time the wrapper will wait for a response from the server (in seconds) | `0` |
| newCredentialStore | *object* | Overrides the default datastore for remembered credentials/sessions | `false` |

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

### Authentication

The api by default will authenticate when the first call is run. However, if you want to expedite the process, you can use the authenticate method with promises or callbacks:

```javascript
const api = new GeotabApi(authentication);
await api.authenticate().then( response => console.log('I have authenticated'));
// OR
api.authenticate( (success) => {
    console.log('Successful authentication');
}, (error) => {
    console.log('Something went wrong');
})
```

To create an instance of the GeotabApi, you must provide at minimum an authentication object. This object can either contain a password, or a sessionId:

| Parameter | type | Default |
| --- | --- | --- |
| authentication | `object` | |
| options | `object` |  |


Using callbacks will allow you to pass in your own logic to be executed when the call is complete.

The standard pattern for callback responses is as follows:

```javascript
function callback(result){
    //Your response logic
    console.log(result)
}
```

### Call

##### Promises
In an effort to give you more control over the actual responses, the wrapper will return an [Axios Response Object](https://github.com/axios/axios#response-schema). This object contains several bits of information about the request and it's response, similar to the `fetch()` api. Response data will be held in the data section of the response, as demonstrated in subsequent sections.

Make a request to the database and receive a promise
```javascript
let myCall = api.call('Get', {
    typeName: 'Device',
    resultsLimit: 1
});

myCall
    .then( result => result.data)
    .then( data => console.log(`Server response data: ${data}`))
    .catch( error => console.log(error));
})
```

##### Callbacks

Make a request to the database by providing a success/error callback

```javascript
api.call('Get', {
    typeName: 'Device',
    resultsLimit: 1
}, function (result) {
    if (result) {
        console.log(result);
    }
}, function (err) {
    console.error(err);
});
```

### MultiCall

Perform multiple queries against the database in a single HTTPS request 

##### Promises

```javascript
let calls = [
    ['Get', { typeName: 'Device', resultsLimit: 1 }],
    ['Get', { typeName: 'User', resultsLimit: 1 }]
];
let myMultiCall = api.multiCall(calls)

myMultiCall
    .then(result => result.data)
    .then(data => console.log(`Server response: ${data}`))
    .catch(error => console.log(error));
```

##### Callbacks

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
}, function (err) {
    console.error(err);
}))
```

### Forget

Clears credentials and the credential store.

```javascript
api.forget();
```

##### Promises

Forget also allows a promise to be returned. By default this returns a fresh set of credentials

```javascript
let myForgetCall = api.forget();

myForgetCall
    .then(result => result.data)
    .then(data => console.log(`Server response: ${data}`))
    .catch(error => console.log(error));
```

### GetSession
Retrieves the API user session. Returns the credentials and server

##### Promises

```javascript
let mySession = api.getSession();
mySession
    .then(result => result.data)
    .then(data => console.log(`Server response: ${data}`))
    .catch(error => console.log(error));
```

##### Callbacks

```javascript
api.getSession(function (result) {
    console.log(result.credentials, result.path);
});
```
## Breaking Changes

As of v2.0.0, there are several noteable changes that will cause previous implementations of the api wrapper to fail.

##### GeotabApi credential callback

Using a credentials callback is no longer an option. All credentials must be passed as an authentication object described above

##### JSONP

JSONP is no longer supported both as a function and as an argument in the options parameter

##### GetSession callback object

getSession now returns a single result object that maintains consistency with the authentication call response.
