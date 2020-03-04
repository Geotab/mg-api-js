const nock = require('nock');
const mocks = require('../../mocks/mocks');
let authenticationAttempt = 0;

// Decodingthe encoded request
const parseBody = (bodyStr) => {
    return JSON.parse(bodyStr['JSON-RPC']);
}
// const auth = nock(`https://${mocks.server}/apiv1/`)
//             .persist()
//             .filteringRequestBody( (body) => parseBody(body) )
//             .post('/Authenticate')
//             .reply(200, (uri, body) => parseBody(body))

// Authentication
// Alternating between credentials to help test the forget function
const auth1 = nock(`https://${mocks.server}/apiv1/`, {
        conditionally: () => authenticationAttempt % 2 === 0
    })
        .persist()
        .post('/Authenticate', (body) => {
            let parsed = parseBody(body);
            return parsed.params.database === 'testDB';
        })
        .reply(200, () => {
            authenticationAttempt++;
            return {result: mocks.credentials}
        })

const auth2 = nock(`https://${mocks.server}/apiv1/`, {
            conditionally: () => authenticationAttempt % 2 === 1
        })
        .persist()
        .post('/Authenticate', (body) => {
            let parsed = parseBody(body);
            return parsed.params.database === 'testDB';
        })
        .reply(200, () => {
            authenticationAttempt++;
            return {result: mocks.refreshedCredentials}
        })

const auth3 = nock(`https://${mocks.server}/apiv1/`)
        .persist()
        .post('/Authenticate', (body) => {
            let parsed = parseBody(body);
            return parsed.params.database === 'badinfo';
        })
        .reply(200, () => {
            authenticationAttempt++;
            return {
                    error: {
                        name: "InvalidUserException",
                        message: "Bad info entered"
                    }
            }
        })

// Get requests
const get = nock(`https://${mocks.server}/apiv1/`)
            .persist()
// Device
get
    .post('/Get', (request) => { 
        // Checking inbound request to see if it's a device
        return JSON.parse(request['JSON-RPC'])['params']['typeName'] === 'Device'
    })
    .reply(200, {result: mocks.device})
// User
get
    .post('/Get', (request) => {
        return JSON.parse(request['JSON-RPC'])['params']['typeName'] === 'Device'
    })
    .reply(200, {result: mocks.user});

// Failing call
get
    .post('/Geet')
    .reply(200, {result: {
        error: {
            name: 'InvalidRequest',
            message: 'Invalid request information entered'
        }
    }})
// GetCountOf Requests
const getCount = nock(`https://${mocks.server}/apiv1/`)
            .persist()

getCount
    .post('/GetCountOf', (request) => {
        return JSON.parse(request['JSON-RPC'])['params']['typeName'] === 'Device'
    })
    .reply(200, {result: 2000});

getCount
    .post('/GetCountOf', (request) => {
        return JSON.parse(request['JSON-RPC'])['params']['typeName'] === 'User'
    })
    .reply(200, {result: 2001});

const multiCall = nock(`https://${mocks.server}/apiv1/`)
                .persist()
                .post('/ExecuteMultiCall')
                .reply(200, {result: [2000, 2001]})