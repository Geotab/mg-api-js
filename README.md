# mg-api-js

A MyGeotab API wrapper for clientside javascript

## Installation

```
$ bower install --save mg-api-js
```

## Usage

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

## API
### call
Make a request to the database
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

### multiCall
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

### forget
Clears credentials and the credential store.
```
api.forget();
```

### getSession
Retrieves the API user session.
```
api.getSession(function (session) {
    console.log(session);
});
```

## License

MIT
