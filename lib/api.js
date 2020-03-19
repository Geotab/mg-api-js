/*! mg-api-js - v1.0.0
 *  Release on: 2020-02-27
 *  Copyright (c) 2020 Geotab Inc
 *  Licensed MIT */
// UMD Declaration
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define([], function () {
      return (root['GeotabApi'] = factory());
    });
  } else if (typeof module === 'object' && module.exports) {
    // Node does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    root['GeotabApi'] = factory();
  }
}(this, function () {
// Handling platform variable diffs (winow, localstorage, xmlhttp/http, etc)
// Cross platform requests
// const axios = require('axios').default;
const LocalStorageCredentialStore = require('./LocalStorageCredentialStore.js').default;
const AxiosCall = require('./AxiosCall').default;
// Cross platform localstorage
if (typeof localStorage === 'undefined' || localStorage === null) {
  // Mocking local storage for nodeJS implementation. 
  const LocalStorageMock = require('./LocalStorageMock').default;
  localStorage = new LocalStorageMock();
}
// Allowing async for ie10/11 - webpack requirement
const regeneratorRuntime = require('regenerator-runtime'); 

/**
*  @version 2020-03-05
*  @description The Geotab JS API library.
*  Used to login and make any API calls to a Geotab server.
*
*  If credentials are required (for example, the first time you've visited the page, the
*  database has moved or the user's password has changed, etc.), the 'getCredentials' can be executed
*  with a callback function that can be used on your end to pass credentials into the system. When
*  you call this function, any pending calls will also be completed automatically.
*
* ** NOTE ** This version (uncompiled with webpack) of the API will not work on browsers.
*       This will fail due to the node module dependancies not being shaken/added to the 
*       output file
*
*  @example - authentication with callback
*  var api = GeotabApi(function(authenticateCallback) {
*      // We need credentials; we either never had them, or lost them (the server was moved, password
*      // changed, etc.)
*
*      someLoginDialog.style.display = 'block' // Show a login dialog
*      someLoginButton.addEventListener('click', function () {
*          // Call to authenticate
*          authenticateCallback(serverField.value, databaseField.value, emailField.value, passwordField.value, function(errorString) {
*              alert(errorString)
*          })
*      })
*  })
*
*  You can also pass the Api object a credentials object and have a promise returned
*  @example
*    let api = await new GeotabApi({
*        server: login.server,
*        database: 'badinfo',
*        username: login.username,
*        password: login.password
*    }).catch(err => console.log(err));
*
*  @function
*  @param {Function} getCredentials This function is called when this class can't login or is fetching credentials for the first time
*  @param {Object} [newOptions] Can be used to override default values in the 'options' variable
*  @param {Object} [customCredentialStore] Override the default localStorage-based credential storage with a custom storage implementation
*/
const GeotabApi = function (getCredentials, newOptions, customCredentialStore) {
  'use strict'
  let JSONP_REQUESTS_PROPERTY_STR = 'geotabJSONP'; // appends to window and request for JSONP
  let credentials;
  let server;
  let cred;
  // If we require authentication before running calls, we store them here and iterate the calls later
  let pendingCalls = [];
  let options = {
      // Use localStorage to store credentials automatically
      rememberMe: true,
      // Show debugging information (in Chrome dev tools, Firebug, etc.)
      debug: false,
      // Use JSONP for all calls (for using the API without running a server)
      jsonp: false,
      // How long to wait for a response from the server (in seconds); 0 (or null) means no timeout.
      timeout: 0
    };
    // Where we store our acquired credentials
    let credentialsStore;
    /**
     *  Logs some debug information to the browser console, if options.debug is true
     *  @private
     */
    const debugLog = function () {
      if (options.debug) {
        var logs = [new Date()];
        logs.push.apply(logs, arguments);
        console.log.apply(console, logs);
      }
    };
    /**
     *  Normalizes and handles errors
     *  @private
     *  @param {Object} [error] The error object
     *  @callback {failureCallback} [errorCallback] The function to call once the error has been normalize.
     *                                                  It passes back a string for a known error, and the raw error
     *                                                  object if some custom handling is required.
     */
    const handleError = function (error, errorCallback) {
      var errorString
      if (error && error.name && error.message) {
        errorString = error.name + ': ' + error.message;
      } else if (error.target || (error instanceof XMLHttpRequest && error.status === 0)) {
        errorString = 'Network Error: Couldn\'t connect to the server. Please check your network connection and try again.';
      }
      if (options.debug) {
        console.error(errorString, error);
      }
      if (errorCallback) {
        errorCallback(errorString || 'Error', error);
      }
    }

    /**
     *  Creates a GeotabApi call using Axios to differentiate between node and browser reqests.
     *    Browser requests are done via XMLHTTPRequest
     *    Node requests are done using http module
     *  @private
     *  @param {String} method The name of the API method
     *  @param {Object} params The method parameters
     *  @param {successCallback} callbackSuccess The function that is called if the method call was successful
     *  @param {failureCallback} [callbackError] The function that is called if the method call failed
     *  @return {Object} Promise object of Axios request. Allows for promise support
     */
    const callAxios = async function (method, params, callbackSuccess, callbackError) {
      return new AxiosCall(method, server, params, callbackSuccess, callbackError).send();
    };
    /**
     *  Acts as a router for differentiating between JSONP and normal calls
     *  @private
     *  @param {String} method The name of the API method
     *  @param {Object} params The method parameters
     *  @param {successCallback} callbackSuccess The function that is called if the method call was successful
     *  @param {failureCallback} [callbackError] The function that is called if the method call failed
     *  @return {Object} Call promise - Axios request. Allows users to interact with the api via promises
     */
    const callBase = function (method, params, callbackSuccess, callbackError) {
        let response = callAxios(method, params, callbackSuccess, callbackError);
        // Promise behaviour
        return response;
    };
    /**
     *  Authenticates a Geotab user against the server by sending an 'Authenticate' call with collected credentials
     *  @private
     *  @param {String} newServer The federation server name string
     *  @param {String} database The database name
     *  @param {String} username The user name/email to authenticate with
     *  @param {String} password The password to authenticate with
     *  @param {successCallback} callbackSuccess The function that is called on the successful authentication
     *  @param {failureCallback} [callbackError] The function that is called when there is an
     *                                            authentication failure with the error string and the
     *                                            error objects as parameters
     *  @return {Object} A promise of the axios request
     */
    const authenticateWithServer = function (newServer, database, username, password, callbackSuccess, callbackError) {
      server = newServer;
      let request;
      // Authenticate the user
      request = callBase('Authenticate', {
        database: database,
        userName: username,
        password: password
      }, function (data) {
        if (data.path && data.path !== 'ThisServer') {
          server = 'https://' + data.path + '/'
        }
        credentials = data.credentials
        if (options.rememberMe) {
          credentialsStore.set(credentials, server);
        }
        if (callbackSuccess) {
          callbackSuccess();
        }
      }, callbackError);
      // Axios promise of the request is returned
      return request;
    };
    /**
     *  Pulls out credentials from the provided callback method (legacy) and uses them to call against 
     *    the authentication method. Authentication method (and subsequent call method) will always 
     *    return a promise. If a callback (legacy) was provided, and the user doesn't catch the
     *    promise, the function behaves as expected
     *  @private
     *  @param {successCallback} [callbackSuccess] Called when we have successfully authenticated
     *  @returns {Object} Axios promise of credentials authentication call
     */
    const populateAuthenticationCallback = async function (callbackSuccess) {
      let request;
      // Pulling out the values we need from the callback to avoid over complicating things
      if(typeof getCredentials === 'function'){
        // We were passed the legacy credentials callback
        await getCredentials(function(newServer, database, username, password, error){
          cred = {
            server: newServer,
            database: database,
            userName: username,
            password: password,
            error: error
          };
        });
      } else {
        cred = getCredentials; // We were passed raw credentials
      }
      if(cred){
        // Authentication/calls will always return a promise
        request = authenticateWithServer(cred.server, cred.database, cred.userName, cred.password, function() {
          // If a success callback was provided in the authentication request, we fire it
              if (callbackSuccess) {
                callbackSuccess();
              }
              // Try the request(s) again
              pendingCalls.forEach(function (p) {
                call.apply(this, p);
              })
              pendingCalls = [];
        }, cred.error);
        return request;
      }
    };
    // Storing the current call to the pending queue and try to get credentials
    const needsLoginAndCall = function (method, params, callbackSuccess, callbackError) {
      // Method will only exist if this is invoked from 'call()'
      if(method){
        pendingCalls.push([method, params, callbackSuccess, callbackError])
      }
      // attempting to grab credentials from the localstorage
      var storedCredentials = credentialsStore.get();
      if (storedCredentials && options.rememberMe) {
        credentials = storedCredentials.credentials;
        server = storedCredentials.server;
        // Trying the calls again
        pendingCalls.forEach(function (p) {
          call.apply(this, p);
        });
        pendingCalls = [];
        return true;
      } else {
        // Nothing was in localstorage, so we have to use the provided info from instantiation
        // This will re-prompt the user if it is configured in the callback
        return populateAuthenticationCallback();
      }
    }
    /**
     *  Allows user to send calls to the GeotabApi.
     *    - Forwards the desired request to the call router
     * 
     *  Handles cases where the credentials have expired or are invalid
     *    - Re-sends authentication request or prompts for more credentials if necessary
     *  @public
     *  @param {String} method The name of the API method
     *  @param {Object} params The method parameters object.
     *  @param {successCallback} callbackSuccess The function that is called if the method call was successful
     *  @param {failureCallback} [callbackError] The function that is called if the method call failed
     *  @return {Object} Axios call promise if there is no callback, abort function if there is
     */
    const call = function (method, params, callbackSuccess, callbackError) {
      // Checking if the user is authenticated
      if (!credentials) {
        let auth = needsLoginAndCall(method, params, callbackSuccess, callbackError);
        // If we hand a callback error, we don't return a promise
        if(callbackError){
          return { abort: function () { } }
        }
      }
      // Assigning the stored/attained credentials to the params object for authentication with Geotab server
      params.credentials = credentials;
      // Sending the call to the call router
      return callBase(method, params, callbackSuccess, function (errorObject) {
        console.log('errorString', errorObject);
        // Quietly refreshing the credentials
        if (errorObject.name === 'InvalidUserException' && method !== 'Authenticate') {
          // We do have a credentials token, but it's no longer valid
          // Let's clear it
          credentialsStore.clear();
          // And grab the credentials to try again
          needsLoginAndCall();
        } else {
          // If we were trying to authenticate, and the error wasn't related to authentication, we just fail it
          if (callbackError) {
            callbackError(errorObject);
          }
        }
      })
    };
    /**
     *  Calls multiple Geotab methods at the same time. Returns an array of results corresponding to the order the calls are passed in
     *  @public
     *  @param {Array} calls The calls array. For each entity in this array, we expect a 1 or 2 item array: the first
     *                                               item is the method name, and (optionally) the second is an object of the method parameters
     *                                               eg. [
     *                                                      ['GetVersion'],
     *                                                      ['Get', { typeName: 'Device', search: { serialNumber: 'GTA1234556678' } }],
     *                                                      ['Add', { typeName: 'Device', entity: { name: 'New Device', serialNumber: 'GTA0000000000' }]
     *                                                   ]
     *  @param {successCallback} callbackSuccess The function that is called if the method calls were all successful
     *  @param {failureCallback} [callbackError] The function that is called if any method call failed
     *  @return {Object} An object with operations for the call. Supported operation(s): abort()
     */
    const multiCall = function (calls, callbackSuccess, callbackError) {
      var formattedCalls = calls.map(function (call) {
        var params = call[1];
        return {
          method: call[0],
          params: params
        }
      })
      return call('ExecuteMultiCall', {
        calls: formattedCalls
      }, callbackSuccess, callbackError);
    };
    /**
     *  Retrieves a session. Useful for single sign-on or other cases where you require the credentials
     *  @param {successCallback} callbackSuccess The function that is called if the retrieval of sessionId was successful
     *  @param {Boolean} [newSession] If true, always retrieve a new session from the server. Otherwise, return the current session (if active) or
     *                              retrieve a new one from the server if there are no active sessions
     */
    const getSession = async function (callbackSuccess, newSession) {
      var storedCredentials = credentialsStore.get();
      if (!newSession && storedCredentials && options.rememberMe) {
        if (callbackSuccess) {
          callbackSuccess(storedCredentials.credentials, storedCredentials.server);
          return // Legacy code
        } else {
          // This will resolve the promise immediately without much hassle
          return [storedCredentials.credentials, storedCredentials.server];
        }
      }
      if(callbackSuccess){
        populateAuthenticationCallback(function () {
          // At this point, 'credentials' and 'server' have been set within populateAuthenticationCallback()
          callbackSuccess(credentials, server);
        });   
      } else {
        let response = populateAuthenticationCallback();
        response.then( res => {
          // 'Intercepting' the promise before it gets to the user to make the output more in line with
          // The legacy behavior (should return an array with the credentials object and server)
          res.data.result = [res.data.result.credentials, server];
          return res;
        });
        return response;
      } 
    };
    /**
     *  Clears credentials and the credential store.
     *  Resets session with already provided credentials
     *  @public
     */
    const forget = async function () {
      credentials = null;
      credentialsStore.clear();
      // Consider making this a function
      let response = populateAuthenticationCallback();
      response.then( res => {
        // 'Intercepting' the promise before it gets to the user to make the output more in line with
        // The legacy behavior (should return an array with the credentials object and server)
        res.data.result = [res.data.result.credentials, server];
        return res;
      });
      return response;
    }
  // ** 'Constructor' - logic to be executed when API loads**
  // Overrides default options with passed in ones, if there are any
  if (newOptions) {
    for (var prop in newOptions) {
      if (newOptions.hasOwnProperty(prop)) {
        options[prop] = newOptions[prop];
      }
    }
  }
  
  /**
   *  The default credentials store. Uses localStorage to save and retrieve
   *  credentials to save a user's session.
   */
  let defaultCredentialsStore = new LocalStorageCredentialStore();
  // If applicable, overrides default credentials storage implementation with a
  // custom one that was passed into the constructor
  credentialsStore = customCredentialStore || defaultCredentialsStore;
  // Handing plain credentials will make the response a promise
  if(typeof getCredentials === 'object' && !options.jsonp){
    let initialAuthentication = new Promise( (resolve, reject) => {
      let auth = needsLoginAndCall();
      // Have received a promise
      if(typeof auth === 'object'){
        auth
          .then(response => {
            if(response.data.error){
              // We want the error returning to the user instead of the api
              // Failing instantiation (eg. Bad credentials)
              resolve(response.data);
            } else if(response.data.result){
              // Resolving Public methods -> Successful instantiation
              resolve({
                call: call,
                multiCall: multiCall,
                forget: forget,
                getSession: getSession
              });
            }
          })
          .catch(err => reject(err));
      } else if(auth){
        // Stored Credentials
        resolve({
          call: call,
          multiCall: multiCall,
          forget: forget,
          getSession: getSession
        });
      } else {
        reject();
      }
    });
    // Give the user the authentication promise so they can verify the api themselves
    return initialAuthentication;
  } else if(typeof getCredentials === 'object' && options.jsonp){
    // JSONP credential request behaves slightly different with response structure
    let initialAuthentication = new Promise( (resolve, reject) => {
      let auth = needsLoginAndCall();
      // Have received a promise
      if(typeof auth === 'object'){
        auth
          .then(response => {
              // Resolving Public methods -> Successful instantiation
              resolve({
                call: call,
                multiCall: multiCall,
                forget: forget,
                getSession: getSession
              });
          })
          .catch(err => reject(err));
        }});
   } else {
      // Checking if the user is still authenticated and running prompt if not
      let auth = needsLoginAndCall();
      // Public methods
      return {
        call: call,
        multiCall: multiCall,
        forget: forget,
        getSession: getSession
      }
  }
}
// Exposing the object - acts like a constructor for browser implementations
return GeotabApi;
}));