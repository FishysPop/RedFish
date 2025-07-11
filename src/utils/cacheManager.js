const NodeCache = require('node-cache');

// --- Cache Instances ---
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

// --- Analytics Caching (Per-Cluster) ---

const analyticsCache = new NodeCache({
  stdTTL: 0, // No TTL, lives until manually cleared or sent
  checkperiod: 0, // No periodic check
  useClones: true, // Return clones to prevent mutation issues
});

let _client = null;
let analyticsIntervalId = null;
const ANALYTICS_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const ANALYTICS_CACHE_KEY = 'localAnalytics';

/**
 * Initializes the cache manager with the Discord client instance.
 * Required for sharded analytics processing.
 * @param {import('discord.js').Client} clientInstance - The Discord client instance.
 */
function initializeCacheManager(clientInstance) {
  _client = clientInstance;
}

/**
 * Merges analytics data from a secondary cluster into the main cluster's cache.
 * This function only runs on the main cluster (0).
 * @param {object} incomingData - The analytics data from the secondary cluster.
 */
function _mergeIncomingAnalytics(incomingData) {
  try {
    let mainData = analyticsCache.get(ANALYTICS_CACHE_KEY);
    if (!mainData) {
      // If the main cache is empty, the incoming data becomes the new baseline.
      analyticsCache.set(ANALYTICS_CACHE_KEY, incomingData);
      return;
    }

    // Merge numeric counts
    mainData.totalPlayCount = (mainData.totalPlayCount || 0) + (incomingData.totalPlayCount || 0);
    mainData.playHasPlayerSettingsCount = (mainData.playHasPlayerSettingsCount || 0) + (incomingData.playHasPlayerSettingsCount || 0);
    mainData.failedPlayCount = (mainData.failedPlayCount || 0) + (incomingData.failedPlayCount || 0);
    mainData.failedSearchCount = (mainData.failedSearchCount || 0) + (incomingData.failedSearchCount || 0);

    // Merge usedSearchEngines (Map-like object)
    if (incomingData.usedSearchEngines) {
      for (const [engine, count] of Object.entries(incomingData.usedSearchEngines)) {
        mainData.usedSearchEngines[engine] = (mainData.usedSearchEngines[engine] || 0) + count;
      }
    }

    // Merge guildPlayCount (Array of objects)
    if (incomingData.guildPlayCount) {
      incomingData.guildPlayCount.forEach(incomingGuild => {
        const mainGuild = mainData.guildPlayCount.find(g => g.guildId === incomingGuild.guildId);
        if (mainGuild) {
          mainGuild.playCount += incomingGuild.playCount;
        } else {
          mainData.guildPlayCount.push(incomingGuild);
        }
      });
    }

    analyticsCache.set(ANALYTICS_CACHE_KEY, mainData);
  } catch (error) {
    console.error('[CacheManager] Error merging incoming analytics:', error);
  }
}

/**
 * Saves the aggregated analytics from the main cluster's cache to the database.
 * This function should only ever be executed on the main cluster.
 * @param {import('mongoose').Model} AnalyticsModel - The Mongoose model for Analytics.
 */
async function _saveAnalyticsToDB(AnalyticsModel) {
  const cachedAnalytics = analyticsCache.get(ANALYTICS_CACHE_KEY);
  if (cachedAnalytics) {
    try {
      // Using findOneAndUpdate with upsert is robust for the single analytics document.
      // This overwrites the document with the latest aggregated data.
      await AnalyticsModel.findOneAndUpdate({}, cachedAnalytics, { upsert: true });
      if (process.env.DEBUG === 'true') console.log('[CacheManager] Analytics data saved to DB.');
    } catch (error) {
      console.error('[CacheManager] Error saving analytics data to DB:', error);
    }
  }
}

/**
 * Sends the local analytics cache from a secondary cluster to the main cluster.
 * This function only runs on secondary clusters.
 */
function _sendAnalyticsToMainShard() {
  const localData = analyticsCache.get(ANALYTICS_CACHE_KEY);
  if (localData && _client && _client.cluster) {
    // Only send if there's actually data to report
    if ((localData.totalPlayCount || 0) > 0 || (localData.failedPlayCount || 0) > 0 || (localData.failedSearchCount || 0) > 0) {
      _client.cluster.send({ type: 'ANALYTICS_SYNC_IPC', data: localData });
      // Clear the local cache for the next interval
      analyticsCache.del(ANALYTICS_CACHE_KEY);
      if (process.env.DEBUG === 'true') {
        console.debug(`[CacheManager] Sent local analytics from Cluster ${_client.cluster.id} to main shard.`);
      }
    }
  }
}

/**
 * Starts the analytics processing loop based on the cluster's role.
 * - Main Cluster: Loads initial data from DB and periodically saves aggregated data back to DB.
 * - Secondary Clusters: Periodically sends its local analytics data to the main cluster.
 * @param {import('mongoose').Model} AnalyticsModel - The Mongoose model for Analytics.
 */
function startAnalyticsProcessor(AnalyticsModel) {
  if (analyticsIntervalId) {
    clearInterval(analyticsIntervalId);
  }

  const isMainCluster = !_client || !_client.cluster || _client.cluster.id === 0;

  if (isMainCluster) {
    // --- Main Cluster Logic ---
    AnalyticsModel.findOne({}).lean().then(dbData => {
      if (dbData) {
        // Ensure nested objects exist and convert Mongoose Map if necessary
        dbData.usedSearchEngines = dbData.usedSearchEngines instanceof Map ? Object.fromEntries(dbData.usedSearchEngines) : (dbData.usedSearchEngines || {});
        dbData.guildPlayCount = dbData.guildPlayCount || [];
        analyticsCache.set(ANALYTICS_CACHE_KEY, dbData);
        if (process.env.DEBUG === 'true') console.log('[CacheManager] Initial analytics data loaded into cache on main cluster.');
      }
    }).catch(err => console.error('[CacheManager] Error loading initial analytics:', err));

    analyticsIntervalId = setInterval(() => {
      _saveAnalyticsToDB(AnalyticsModel);
    }, ANALYTICS_SYNC_INTERVAL_MS);

    if (process.env.DEBUG === 'true') console.log(`[CacheManager] Analytics DB saver started on main cluster. Will save every ${ANALYTICS_SYNC_INTERVAL_MS / 60000} minutes.`);
  } else {
    // --- Secondary Cluster Logic ---
    analyticsIntervalId = setInterval(() => {
      _sendAnalyticsToMainShard();
    }, ANALYTICS_SYNC_INTERVAL_MS);

    if (process.env.DEBUG === 'true') console.log(`[CacheManager] Analytics sync started on Cluster ${_client.cluster.id}. Will send to main shard every ${ANALYTICS_SYNC_INTERVAL_MS / 60000} minutes.`);
  }
}

/**
 * Updates the local analytics cache on the current cluster.
 * @param {object} options - The options for updating analytics.
 * @param {string} [options.guildId] - The ID of the guild where the event occurred.
 * @param {boolean} [options.hasPlayerSettings] - Whether the user had player settings.
 * @param {string} [options.usedSearchEngine] - The search engine used.
 * @param {'playError' | 'noResults'} [options.errorType] - The type of error, if any.
 */
function updatePlayAnalytics({ guildId, hasPlayerSettings, usedSearchEngine, errorType } = {}) {
  try {
    let analyticsData = analyticsCache.get(ANALYTICS_CACHE_KEY);

    if (!analyticsData) {
      // Initialize a fresh analytics object if one doesn't exist in the cache
      analyticsData = {
        totalPlayCount: 0,
        playHasPlayerSettingsCount: 0,
        failedPlayCount: 0,
        failedSearchCount: 0,
        usedSearchEngines: {},
        guildPlayCount: [],
      };
    }

    if (errorType) {
      if (errorType === 'playError') analyticsData.failedPlayCount++;
      else if (errorType === 'noResults') analyticsData.failedSearchCount++;
    } else {
      analyticsData.totalPlayCount++;
      if (hasPlayerSettings) analyticsData.playHasPlayerSettingsCount++;
      if (usedSearchEngine) {
        analyticsData.usedSearchEngines[usedSearchEngine] = (analyticsData.usedSearchEngines[usedSearchEngine] || 0) + 1;
      }
      if (guildId) {
        const guildAnalytics = analyticsData.guildPlayCount.find(g => g.guildId === guildId);
        if (guildAnalytics) {
          guildAnalytics.playCount = (guildAnalytics.playCount || 0) + 1;
        } else {
          analyticsData.guildPlayCount.push({ guildId: guildId, playCount: 1 });
        }
      }
    }
    analyticsCache.set(ANALYTICS_CACHE_KEY, analyticsData);
  } catch (error) {
    console.error("[CacheManager] Error updating local analytics cache:", error);
  }
}

/**
 * Handles an incoming analytics data sync from a secondary cluster, received via IPC on the main cluster.
 * @param {object} data - The analytics data from the IPC message.
 */
function handleIncomingAnalyticsUpdate(data) {
  if (process.env.DEBUG === 'true') {
    console.debug(`[CacheManager] Received analytics sync from a cluster. Merging now.`);
  }
  _mergeIncomingAnalytics(data);
}

module.exports = {
  guildSettingsCache,
  userSettingsCache,
  playlistCache,
  giveawayCache,
  analyticsCache,
  initializeCacheManager,
  startAnalyticsProcessor, 
  updatePlayAnalytics,
  handleIncomingAnalyticsUpdate,
};