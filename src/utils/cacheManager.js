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
  if (process.env.DEBUG === 'true') {
    console.debug('[CacheManager] Initialized with client:', {
      hasClient: !!clientInstance,
      hasCluster: !!clientInstance?.cluster,
      clusterId: clientInstance?.cluster?.id
    });
  }
}

/**
 * Merges analytics data from a secondary cluster into the main cluster's cache.
 * This function only runs on the main cluster (0).
 * @param {object} incomingData - The analytics data from the secondary cluster.
 */
function _mergeIncomingAnalytics(incomingData) {
  try {
    let mainData = analyticsCache.get(ANALYTICS_CACHE_KEY);
    
    if (process.env.DEBUG === 'true') {
      console.debug('[CacheManager] Merging analytics data:', {
        hasMainData: !!mainData,
        incomingDataKeys: Object.keys(incomingData || {}),
        incomingTotalPlayCount: incomingData?.totalPlayCount,
        incomingSearchEngines: incomingData?.usedSearchEngines,
        incomingGuildCount: incomingData?.guildPlayCount?.length
      });
    }
    
    if (!mainData) {
      // If the main cache is empty, the incoming data becomes the new baseline.
      // Ensure proper initialization of nested objects
      const initializedData = {
        totalPlayCount: incomingData.totalPlayCount || 0,
        playHasPlayerSettingsCount: incomingData.playHasPlayerSettingsCount || 0,
        failedPlayCount: incomingData.failedPlayCount || 0,
        failedSearchCount: incomingData.failedSearchCount || 0,
        usedSearchEngines: incomingData.usedSearchEngines || {},
        guildPlayCount: incomingData.guildPlayCount || []
      };
      
      if (process.env.DEBUG === 'true') {
        console.debug('[CacheManager] Initializing cache with incoming data:', initializedData);
      }
      
      analyticsCache.set(ANALYTICS_CACHE_KEY, initializedData);
      return;
    }

    // Merge numeric counts
    mainData.totalPlayCount = (mainData.totalPlayCount || 0) + (incomingData.totalPlayCount || 0);
    mainData.playHasPlayerSettingsCount = (mainData.playHasPlayerSettingsCount || 0) + (incomingData.playHasPlayerSettingsCount || 0);
    mainData.failedPlayCount = (mainData.failedPlayCount || 0) + (incomingData.failedPlayCount || 0);
    mainData.failedSearchCount = (mainData.failedSearchCount || 0) + (incomingData.failedSearchCount || 0);

    // Merge usedSearchEngines (Map-like object)
    if (incomingData.usedSearchEngines) {
      if (!mainData.usedSearchEngines) mainData.usedSearchEngines = {};
      for (const [engine, count] of Object.entries(incomingData.usedSearchEngines)) {
        const previousCount = mainData.usedSearchEngines[engine] || 0;
        const newCount = previousCount + (count || 0);
        mainData.usedSearchEngines[engine] = newCount;
        
        if (process.env.DEBUG === 'true' && count > 0) {
          console.debug(`[CacheManager] Merged search engine data: ${engine} += ${count} (now ${newCount})`);
        }
      }
    }

    // Merge guildPlayCount (Array of objects)
    if (incomingData.guildPlayCount) {
      if (!mainData.guildPlayCount) mainData.guildPlayCount = [];
      incomingData.guildPlayCount.forEach(incomingGuild => {
        const mainGuild = mainData.guildPlayCount.find(g => g.guildId === incomingGuild.guildId);
        if (mainGuild) {
          const previousCount = mainGuild.playCount || 0;
          const addedCount = incomingGuild.playCount || 0;
          mainGuild.playCount = previousCount + addedCount;
          
          if (process.env.DEBUG === 'true' && addedCount > 0) {
            console.debug(`[CacheManager] Merged guild play count: ${incomingGuild.guildId} += ${addedCount} (now ${mainGuild.playCount})`);
          }
        } else {
          // Create a copy of the incoming guild object to avoid reference issues
          const newGuildEntry = {
            guildId: incomingGuild.guildId,
            playCount: incomingGuild.playCount || 0
          };
          mainData.guildPlayCount.push(newGuildEntry);
          
          if (process.env.DEBUG === 'true' && newGuildEntry.playCount > 0) {
            console.debug(`[CacheManager] Added new guild play count: ${newGuildEntry.guildId} = ${newGuildEntry.playCount}`);
          }
        }
      });
    }

    if (process.env.DEBUG === 'true') {
      console.debug('[CacheManager] Final merged data:', {
        totalPlayCount: mainData.totalPlayCount,
        searchEngines: mainData.usedSearchEngines,
        guildCount: mainData.guildPlayCount.length
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
      if (process.env.DEBUG === 'true') {
        console.log('[CacheManager] Saving analytics data to DB:', {
          totalPlayCount: cachedAnalytics.totalPlayCount,
          searchEngines: cachedAnalytics.usedSearchEngines,
          guildCount: cachedAnalytics.guildPlayCount?.length
        });
      }
      
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
    const hasDataToReport = (localData.totalPlayCount || 0) > 0 || 
                           (localData.failedPlayCount || 0) > 0 || 
                           (localData.failedSearchCount || 0) > 0 ||
                           (localData.playHasPlayerSettingsCount || 0) > 0 ||
                           (localData.usedSearchEngines && Object.keys(localData.usedSearchEngines).length > 0) ||
                           (localData.guildPlayCount && localData.guildPlayCount.length > 0);
    
    if (process.env.DEBUG === 'true') {
      console.debug(`[CacheManager] Checking if cluster ${_client.cluster.id} has data to send:`, {
        hasDataToReport: hasDataToReport,
        totalPlayCount: localData.totalPlayCount,
        failedPlayCount: localData.failedPlayCount,
        failedSearchCount: localData.failedSearchCount,
        hasSearchEngines: localData.usedSearchEngines && Object.keys(localData.usedSearchEngines).length > 0,
        searchEngines: localData.usedSearchEngines,
        guildCount: localData.guildPlayCount?.length
      });
    }
    
    if (hasDataToReport) {
      // Create a deep copy of the data to avoid reference issues
      const dataToSend = {
        totalPlayCount: localData.totalPlayCount || 0,
        playHasPlayerSettingsCount: localData.playHasPlayerSettingsCount || 0,
        failedPlayCount: localData.failedPlayCount || 0,
        failedSearchCount: localData.failedSearchCount || 0,
        usedSearchEngines: localData.usedSearchEngines ? { ...localData.usedSearchEngines } : {},
        guildPlayCount: localData.guildPlayCount ? [...localData.guildPlayCount] : []
      };
      
      if (process.env.DEBUG === 'true') {
        console.debug(`[CacheManager] Sending analytics data from Cluster ${_client.cluster.id}:`, {
          totalPlayCount: dataToSend.totalPlayCount,
          searchEngines: dataToSend.usedSearchEngines,
          guildCount: dataToSend.guildPlayCount.length
        });
      }
      
      _client.cluster.send({ type: 'ANALYTICS_SYNC_IPC', data: dataToSend });
      // Clear the local cache for the next interval
      analyticsCache.del(ANALYTICS_CACHE_KEY);
      if (process.env.DEBUG === 'true') {
        console.debug(`[CacheManager] Sent local analytics from Cluster ${_client.cluster.id} to main shard.`);
      }
    } else if (process.env.DEBUG === 'true') {
      console.debug(`[CacheManager] No analytics data to send from Cluster ${_client.cluster.id}.`);
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
  if (process.env.DEBUG === 'true') {
    console.debug('[CacheManager] Starting analytics processor with model:', {
      hasModel: !!AnalyticsModel,
      modelName: AnalyticsModel?.modelName
    });
  }
  
  if (analyticsIntervalId) {
    clearInterval(analyticsIntervalId);
  }

  const isMainCluster = !_client || !_client.cluster || (_client.cluster.id === 0);
  
  if (process.env.DEBUG === 'true') {
    const clusterId = _client?.cluster?.id;
    console.debug(`[CacheManager] Cluster identification:`, {
      hasClient: !!_client,
      hasCluster: !!_client?.cluster,
      clusterId: clusterId,
      isMainCluster: isMainCluster
    });
  }

  if (isMainCluster) {
    // --- Main Cluster Logic ---
    AnalyticsModel.findOne({}).lean().then(dbData => {
      if (dbData) {
        // Ensure nested objects exist and convert Mongoose Map if necessary
        let usedSearchEngines = dbData.usedSearchEngines || {};
        if (usedSearchEngines instanceof Map) {
          usedSearchEngines = Object.fromEntries(usedSearchEngines);
        } else if (typeof usedSearchEngines !== 'object' || usedSearchEngines === null) {
          usedSearchEngines = {};
        }
        
        let guildPlayCount = dbData.guildPlayCount || [];
        if (!Array.isArray(guildPlayCount)) {
          guildPlayCount = [];
        }
        
        const processedData = {
          totalPlayCount: dbData.totalPlayCount || 0,
          playHasPlayerSettingsCount: dbData.playHasPlayerSettingsCount || 0,
          failedPlayCount: dbData.failedPlayCount || 0,
          failedSearchCount: dbData.failedSearchCount || 0,
          usedSearchEngines: usedSearchEngines,
          guildPlayCount: guildPlayCount
        };
        
        analyticsCache.set(ANALYTICS_CACHE_KEY, processedData);
        if (process.env.DEBUG === 'true') {
          console.log('[CacheManager] Initial analytics data loaded into cache on main cluster.', {
            totalPlayCount: processedData.totalPlayCount,
            searchEngines: Object.keys(processedData.usedSearchEngines),
            guildCount: processedData.guildPlayCount.length
          });
        }
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

    // Ensure nested objects exist
    if (!analyticsData.usedSearchEngines) analyticsData.usedSearchEngines = {};
    if (!analyticsData.guildPlayCount) analyticsData.guildPlayCount = [];

    if (process.env.DEBUG === 'true') {
      console.debug('[CacheManager] Updating analytics:', {
        guildId: guildId,
        hasPlayerSettings: hasPlayerSettings,
        usedSearchEngine: usedSearchEngine,
        errorType: errorType,
        currentData: {
          totalPlayCount: analyticsData.totalPlayCount,
          searchEngines: analyticsData.usedSearchEngines,
          guildCount: analyticsData.guildPlayCount.length
        }
      });
    }

    if (errorType) {
      if (errorType === 'playError') analyticsData.failedPlayCount = (analyticsData.failedPlayCount || 0) + 1;
      else if (errorType === 'noResults') analyticsData.failedSearchCount = (analyticsData.failedSearchCount || 0) + 1;
      
      if (process.env.DEBUG === 'true') {
        console.debug(`[CacheManager] Updated error count: ${errorType}`, {
          failedPlayCount: analyticsData.failedPlayCount,
          failedSearchCount: analyticsData.failedSearchCount
        });
      }
    } else {
      analyticsData.totalPlayCount = (analyticsData.totalPlayCount || 0) + 1;
      if (hasPlayerSettings) analyticsData.playHasPlayerSettingsCount = (analyticsData.playHasPlayerSettingsCount || 0) + 1;
      if (usedSearchEngine) {
        analyticsData.usedSearchEngines[usedSearchEngine] = (analyticsData.usedSearchEngines[usedSearchEngine] || 0) + 1;
        
        if (process.env.DEBUG === 'true') {
          console.debug(`[CacheManager] Updated search engine count: ${usedSearchEngine} = ${analyticsData.usedSearchEngines[usedSearchEngine]}`);
        }
      }
      if (guildId) {
        const guildAnalytics = analyticsData.guildPlayCount.find(g => g.guildId === guildId);
        if (guildAnalytics) {
          guildAnalytics.playCount = (guildAnalytics.playCount || 0) + 1;
          
          if (process.env.DEBUG === 'true') {
            console.debug(`[CacheManager] Updated guild play count: ${guildId} = ${guildAnalytics.playCount}`);
          }
        } else {
          analyticsData.guildPlayCount.push({ guildId: guildId, playCount: 1 });
          
          if (process.env.DEBUG === 'true') {
            console.debug(`[CacheManager] Added new guild play count: ${guildId} = 1`);
          }
        }
      }
      
      if (process.env.DEBUG === 'true') {
        console.debug('[CacheManager] Updated play analytics:', {
          totalPlayCount: analyticsData.totalPlayCount,
          playHasPlayerSettingsCount: analyticsData.playHasPlayerSettingsCount,
          usedSearchEngines: analyticsData.usedSearchEngines,
          guildPlayCountLength: analyticsData.guildPlayCount.length
        });
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
    console.debug(`[CacheManager] Received analytics sync from a cluster. Merging now.`, {
      dataKeys: Object.keys(data || {}),
      totalPlayCount: data?.totalPlayCount,
      searchEngines: data?.usedSearchEngines,
      guildCount: data?.guildPlayCount?.length
    });
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
