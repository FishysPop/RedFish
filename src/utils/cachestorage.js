const { buildMemoryStorage } = require('axios-cache-interceptor');

const cacheStorage = buildMemoryStorage();

module.exports = { cacheStorage };