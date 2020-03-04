const nock = require('nock');
const mocks = require('../../mocks/mocks');
let authenticationAttempt = 0;

// Authentication
// Alternating between credentials to help test the forget function
const auth1 = nock(`https://${mocks.server}/apiv1/`, {
        conditionally: () => authenticationAttempt % 2 === 0
    })
        .persist()
        .post('/Authenticate')
        .reply(200, () => {
            authenticationAttempt++;
            return {result: mocks.credentials}
        })

const auth2 = nock(`https://${mocks.server}/apiv1/`, {
            conditionally: () => authenticationAttempt % 2 === 1
        })
        .persist()
        .post('/Authenticate')
        .reply(200, () => {
            authenticationAttempt++;
            return {result: mocks.refreshedCredentials}
        });

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