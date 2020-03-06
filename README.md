# mg-api-js

A MyGeotab API wrapper for clientside javascript

## Installation

```
$ npm install --save mg-api-js
```

## Usage

### Callbacks

Good for authenticating with a login screen and situations where the credentials aren't immediately known

```
var api = GeotabApi(function (authenticateCallback) {
        
        // Put handling code here that executes when:
        //      a) We don't have credentials yet (first page load)
        //      b) The credentials have expired (password changed or server moved)
        //      c) You've called "api.forget()"
        // For example, show the login dialog if it is hidden, or prompt the user to enter their credentials
        
        authenticateCallback('server', 'database', 'userName', 'password', function(err) {
            console.error(err);
        });

    }, {
        // Overrides for default options
        rememberMe: false
    });

// Sample API invocation retrieves a single "Device" object
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

### Credentials

If credentials are known, they can be provided in an object. This will return a promise.

```
const credentials = {
    server: 'server',
    database: 'database',
    username: 'username',
    password: 'password'
}
const api = await new GeotabApi(credentials);

// Sample API invocation retrieves a single "Device" object
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
If the api fails to authenticate, it will return an error object instead

```
const credentials = {
    server: 'badinfo',
    database: 'database',
    username: 'username',
    password: 'password'
}

const api = await new GeotabApi(credentials);

if(api.error){
    console.log(api.error.name, ' -> ', api.error.message);
} else {
    api.call(...)...
}
```

## API
### call with callbacks
Make a request to the database by providing a success/error callback
```
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

### call with promises
Make a request to the database and receive a promise
```
let myCall = api.call('Get', {
    typeName: 'Device',
    resultsLimit: 1
});

myCall
    .then( result => console.log(result))
    .catch( error => console.log(error));
})
```

### multiCall with callbacks
Perform multiple queries against the database in a single HTTPS request 
```
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

### multiCall with promises
Perform multiple queries against the database. Receive a promise in return
```
let calls = [
    ['Get', { typeName: 'Device', resultsLimit: 1 }],
    ['Get', { typeName: 'User', resultsLimit: 1 }]
];
let myMultiCall = api.multiCall(calls)

myMultiCall
    .then(result => console.log(result))
    .catch(error => console.log(error));
```

### forget
Clears credentials and the credential store.
```
api.forget();
```

### forget with promises
Forget also allows a promise to be returned. By default this returns a fresh set of credentials
```
let myForgetCall = api.forget();

myForgetCall
    .then( result => console.log(result))
    .catch( error => console.log(error));
```

### getSession with callback
Retrieves the API user session. Returns the credentials and server
```
api.getSession(function (credentials, server) {
    console.log(credentials, server);
});
```

### getSession with promises
```
let mySession = api.getSession();
mySession
    .then( session => console.log(session[0], session[1]))
    .catch( error => console.log(error));
```

## License

MIT
