const nock = require('nock');
const mocks = require('../../mocks/mocks');
let authenticationAttempt = 0;

// RPC Parser
const parse = (body) => {
    console.log(body);
    return JSON.parse(body['JSON-RPC']);
}

// Authentication
// Alternating between credentials to help test the forget function
const auth1 = nock(`https://${mocks.server}/apiv1/`, {
        conditionally: () => authenticationAttempt % 2 === 0
    })
        .persist()
        .post('/', (body) => {
            return body.params.database === 'testDB' && body.method === 'Authenticate';
        })
        .reply(200, () => {
            authenticationAttempt++;
            return {result: mocks.credentials}
        })

const auth2 = nock(`https://${mocks.server}/apiv1/`, {
            conditionally: () => authenticationAttempt % 2 === 1
        })
        .persist()
        .post('/', (body) => {
            return body.params.database === 'testDB' && body.method === 'Authenticate';
        })
        .reply(200, () => {
            authenticationAttempt++;
            return {result: mocks.refreshedCredentials}
        })

// Bad credentials test case
const auth3 = nock(`https://${mocks.server}/apiv1/`)
        .persist()
        .post('/', (body) => {
            return body.params.database === 'badinfo' && body.method === 'Authenticate';
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
    .post('/', (body) => { 
        // Checking inbound body to see if it's a device
        return body.params.typeName === 'Device' && body.method === 'Get'
    })
    .reply(200, {result: mocks.device})
// User
get
    .post('/', (body) => {
        return body.params.typeName === 'User' && body.method === 'Get';
    })
    .reply(200, {result: mocks.user});

// Failing call
get
    .post('/', (body) => {
        return body.method === 'Geet';
    })
    .reply(200, {
        error: {
            name: 'InvalidRequest',
            message: 'Invalid request information entered'
        }
    })
// GetCountOf Requests
const getCount = nock(`https://${mocks.server}/apiv1/`)
            .persist()

getCount
    .post('/GetCountOf', (body) => {
        return body.params.typeName === 'Device' && body.method === 'GetCountOf';
    })
    .reply(200, {result: 2000});

getCount
    .post('/GetCountOf', (body) => {
        return body.params.typeName === 'User' && body.method === 'GetCountOf';
    })
    .reply(200, {result: 2001});

const multiCall = nock(`https://${mocks.server}/apiv1/`)
                .persist()
                .post('/', (body) => {
                    return body.method === 'ExecuteMultiCall'
                })
                .reply(200, {result: [2000, 2001]})