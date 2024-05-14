// Sourcemap node support causes browser issues. Checks for browser global before requiring
if (typeof window !== 'object') {
    require('source-map-support').install();
}

// Allowing async for ie10/11 - webpack requirement
const regeneratorRuntime = require('regenerator-runtime');

const GeotabApi = require('./GeotabApi').default;

module.exports = GeotabApi;