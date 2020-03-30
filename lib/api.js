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
  // Allowing async for ie10/11 - webpack requirement
  const regeneratorRuntime = require('regenerator-runtime'); 
  const GeotabApi = require('./GeotabApi.js').default;
  /**
  * ** NOTE ** This version (uncompiled with webpack) of the API will not work on browsers.
  *       This will fail due to the node module dependancies not being shaken/added to the 
  *       output file
  */
  // Exposing the object - acts like a constructor for browser implementations
  return GeotabApi;
}));