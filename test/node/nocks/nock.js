const nock = require('nock');
const mocks = require('../../mocks/mocks');
let authenticationAttempt = 0;

// Authentication
// Alternating between credentials to help test the forget function
const auth1 = nock(`https://${mocks.server}/apiv1/`, {
        conditionally: () => authenticationAttempt % 2 === 0
    })
        .persist()
        .post('/Authenticate', (body) => {
            return body.params.database === 'testDB';
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
            return body.params.database === 'testDB';
        })
        .reply(200, () => {
            authenticationAttempt++;
            return {result: mocks.refreshedCredentials}
        })

// Bad credentials test case
const auth3 = nock(`https://${mocks.server}/apiv1/`)
        .persist()
        .post('/Authenticate', (body) => {
            return body.params.database === 'badinfo';
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
        return request['params']['typeName'] === 'Device'
    })
    .reply(200, {result: mocks.device})
// User
get
    .post('/Get', (request) => {
        return request['params']['typeName'] === 'Device'
    })
    .reply(200, {result: mocks.user});

// Failing call
get
    .post('/Geet')
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
    .post('/GetCountOf', (request) => {
        return request['params']['typeName'] === 'Device'
    })
    .reply(200, {result: 2000});

getCount
    .post('/GetCountOf', (request) => {
        return request['params']['typeName'] === 'User'
    })
    .reply(200, {result: 2001});

const multiCall = nock(`https://${mocks.server}/apiv1/`)
                .persist()
                .post('/ExecuteMultiCall')
                .reply(200, {result: [2000, 2001]})