// Mocks of MyGeotab objects, these not the full objects, only what we need for our tests
var server = 'www.myaddin.com';
var user = {
  id: 'test1',
  language: 'en',
  firstName: 'Test',
  lastName: 'User',
  name: 'testUser@test.com',
  password: 'Password!23'
};
var login = {
  credentials: {
    userName: user.name,
    password: user.password,
    database: 'testDB',
  },
  path: server
};
var credentials = {
  credentials: {
    database: login.credentials.database,
    sessionId: '3225932739582116430',
    userName: login.credentials.userName,
  },
  path: server
};
var refreshedCredentials = {
  credentials: {
    database: login.credentials.database,
    sessionId: '3225932739582116431',
    userName: login.credentials.userName,
  },
  path: server
}
var device = {
  id: 'test1',
  licensePlate: 'L0L 0L0L',
  vehicleIdentificationNumber: 'AM32W8FV9BU601382',
  comment: 'Comment',
  name: 'DeviceName',
  serialNumber: 'G70000000000'
};

module.exports = {
  server: server,
  login: login,
  user: user,
  credentials: credentials,
  refreshedCredentials: refreshedCredentials,
  device: device
};