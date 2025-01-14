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
                    code: -32000,
                    name: "JSONRPCError",
                    message: "Incorrect login credentials",
                    data: {
                      type: "InvalidUserException",
                      id: "0b508b9e-7b94-4d38-b72f-8629119f73a3",
                      requestIndex: 0
                    }
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
            code: -32000,
            name: "JSONRPCError",
            message: "The method 'Geet' could not be found. Verify the method name and ensure all method parameters are included.",
            data: {
              type: "MissingMethodException",
              id: "ee15868e-6d47-41de-bafc-b20c1ca95152",
              requestIndex: 0
            }
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

multiCall
    .post('/', (body) => {
        let methodNamesCorrect = body.params.calls.every((call) => call.method === 'GetCountOf');
        return body.method === 'ExecuteMultiCall' && methodNamesCorrect
    })
    .reply(200, {result: [2000, 2001]})

multiCall
    .post('/', (body) => {
        let methodNamesIncorrect = body.params.calls.some((call) => call.method === 'GetCountOff');
        return body.method === 'ExecuteMultiCall' && methodNamesIncorrect;
    })
    .reply(200, {
        error: {
            message: "The method 'GetCountOff' could not be found. Verify the method name and ensure all method parameters are included.",
            code: -32601,
            data: {
                id: "ee15868e-6d47-41de-bafc-b20c1ca95152",
                type: "MissingMethodException",
                requestIndex: 1
            },
            name: "JSONRPCError",
            errors: [
                {
                    message: "The method 'Ge' could not be found. Verify the method name and ensure all method parameters are included.",
                    name: "MissingMethodException"
                }
            ]
        },
    })
