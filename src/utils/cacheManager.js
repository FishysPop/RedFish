const NodeCache = require('node-cache');

const defaultTTL = 3600;
const defaultCheckperiod = 600;

const guildSettingsCache = new NodeCache({
  stdTTL: defaultTTL,
  checkperiod: defaultCheckperiod,
});

const userSettingsCache = new NodeCache({
  stdTTL: defaultTTL / 2, 
  checkperiod: defaultCheckperiod / 2,
});

const playlistCache = new NodeCache({
  stdTTL: defaultTTL, 
  checkperiod: defaultCheckperiod,
});

const giveawayCache = new NodeCache({
  stdTTL: defaultTTL, 
  checkperiod: defaultCheckperiod,
});

const analyticsCache = new NodeCache({
  stdTTL: 0, 
  checkperiod: 0, 
  useClones: true, 
});

let analyticsSaveIntervalId = null;
const ANALYTICS_SAVE_INTERVAL_MS = 5 * 60 * 1000; 

async function saveAnalyticsToDB(AnalyticsModel) {
  if (_client && _client.cluster && _client.cluster.id !== 0) {
    if (process.env.DEBUG === 'true') {
      console.debug(`[CacheManager-saveAnalyticsToDB] Attempted to save from non-primary cluster ${_client.cluster.id}. Skipping.`);
    }
    return;
  }

  const cachedAnalytics = analyticsCache.get('globalAnalytics');
  if (cachedAnalytics) {
    try {
      await AnalyticsModel.findOneAndUpdate({}, cachedAnalytics, { upsert: true });
      if (process.env.DEBUG === 'true') console.log('[CacheManager] Analytics data saved to DB.');
    } catch (error) {
      console.error('[CacheManager] Error saving analytics data to DB:', error);
    }
  }
}

let _client = null; 

/**
 * Initializes the cache manager with the Discord client instance.
 * Required for sharded analytics updates.
 * @param {import('discord.js').Client} clientInstance - The Discord client instance.
 */
function initializeCacheManager(clientInstance) {
  _client = clientInstance;
}

function startAnalyticsSaver(AnalyticsModel) {
  AnalyticsModel.findOne().lean().then(dbData => {
    if (dbData && !analyticsCache.has('globalAnalytics')) {
      const plainDbData = { ...dbData };
      if (plainDbData.usedSearchEngines instanceof Map) {
        plainDbData.usedSearchEngines = Object.fromEntries(plainDbData.usedSearchEngines);
      }
      analyticsCache.set('globalAnalytics', plainDbData);
      if (process.env.DEBUG === 'true') console.log('[CacheManager] Initial analytics data loaded into cache.');
    }
  }).catch(err => console.error('[CacheManager] Error loading initial analytics:', err));

  if (analyticsSaveIntervalId) {
    clearInterval(analyticsSaveIntervalId);
  }

  analyticsSaveIntervalId = setInterval(() => {
    saveAnalyticsToDB(AnalyticsModel);
  }, ANALYTICS_SAVE_INTERVAL_MS);
  if (process.env.DEBUG === 'true') console.log(`[CacheManager] Analytics saver started. Will save to DB every ${ANALYTICS_SAVE_INTERVAL_MS / 60000} minutes.`);
}

/**
 * The core logic for updating analytics data in the cache.
 * This function is intended for internal use or direct call on Cluster 0.
 * @param {object} options - The options for updating analytics.
 * @param {string} [options.guildId] - The ID of the guild where the event occurred.
 * @param {boolean} [options.hasPlayerSettings] - Whether the user had player settings.
 * @param {string} [options.usedSearchEngine] - The search engine used.
 * @param {'playError' | 'noResults'} [options.errorType] - The type of error, if any.
 */
function _performAnalyticsUpdate({ guildId, hasPlayerSettings, usedSearchEngine, errorType } = {}) {
  try {
    let analyticsData = analyticsCache.get('globalAnalytics');

    if (!analyticsData) {
      console.warn('[CacheManager-updatePlayAnalytics] Analytics data not found in cache. Initializing a new one. Ensure startAnalyticsSaver has run.');
      analyticsData = {
        totalPlayCount: 0,
        playHasPlayerSettingsCount: 0,
        failedPlayCount: 0,
        failedSearchCount: 0,
        usedSearchEngines: {},
        guildPlayCount: [],
      };
    }

    // Ensure nested structures and default counts exist
    analyticsData.usedSearchEngines = analyticsData.usedSearchEngines || {};
    analyticsData.guildPlayCount = analyticsData.guildPlayCount || [];
    ['totalPlayCount', 'playHasPlayerSettingsCount', 'failedPlayCount', 'failedSearchCount'].forEach(key => {
      // Initialize if undefined or null, but preserve 0 if it exists
      analyticsData[key] = analyticsData[key] || 0;
    });

    if (errorType) {
      if (errorType === 'playError') analyticsData.failedPlayCount++;
      else if (errorType === 'noResults') analyticsData.failedSearchCount++;
    } else {
      analyticsData.totalPlayCount++;
      if (hasPlayerSettings) analyticsData.playHasPlayerSettingsCount++;
      if (usedSearchEngine) analyticsData.usedSearchEngines[usedSearchEngine] = (analyticsData.usedSearchEngines[usedSearchEngine] || 0) + 1;
      if (guildId) {
        const guildAnalytics = analyticsData.guildPlayCount.find(g => g.guildId === guildId);
        if (guildAnalytics) guildAnalytics.playCount = (guildAnalytics.playCount || 0) + 1;
        else analyticsData.guildPlayCount.push({ guildId: guildId, playCount: 1 });
      }
    }
    analyticsCache.set('globalAnalytics', analyticsData);
  } catch (error) {
    console.error("[CacheManager-_performAnalyticsUpdate] Error updating analytics cache:", error);
  }
}

/**
 * Updates the global analytics data.
 * If running in a sharded environment, it sends the data to Cluster 0 for processing.
 * Otherwise, or if on Cluster 0, it updates the cache directly.
 * @param {object} options - The options for updating analytics.
 */
function updatePlayAnalytics(options = {}) {
  if (!_client || !_client.cluster) {
    if (!_client) console.warn('[CacheManager-updatePlayAnalytics] Client not initialized. Analytics update will be local.');
    else if (!_client.cluster) console.warn('[CacheManager-updatePlayAnalytics] client.cluster not available. Analytics update will be local.');
    _performAnalyticsUpdate(options);
    return;
  }

  if (_client.cluster.id === 0) {
    _performAnalyticsUpdate(options);
  } else {
    _client.cluster.send({ type: 'ANALYTICS_UPDATE_IPC', data: options });
    if (process.env.DEBUG === 'true') {
        console.debug(`[CacheManager-updatePlayAnalytics] Sent analytics update from Cluster ${_client.cluster.id} via IPC.`);
    }
  }
}

/**
 * Handles an incoming analytics update message, typically received via IPC on Cluster 0.
 * @param {object} data - The analytics data from the IPC message.
 */
function handleIncomingAnalyticsUpdate(data) {
  if (process.env.DEBUG === 'true') {
    console.debug(`[CacheManager-handleIncomingAnalyticsUpdate] Received analytics update on Cluster 0 for processing.`);
  }
  _performAnalyticsUpdate(data);
}


module.exports = {
  guildSettingsCache,
  userSettingsCache,
  playlistCache,
  giveawayCache,
  analyticsCache,
  initializeCacheManager,
  startAnalyticsSaver,
  updatePlayAnalytics,
  handleIncomingAnalyticsUpdate,
};