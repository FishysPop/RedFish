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
  const cachedAnalytics = analyticsCache.get('globalAnalytics');
  if (cachedAnalytics) {
    try {
      await AnalyticsModel.findOneAndUpdate({}, cachedAnalytics, { upsert: true });
      console.log('[CacheManager] Analytics data saved to DB.');
    } catch (error) {
      console.error('[CacheManager] Error saving analytics data to DB:', error);
    }
  }
}

function startAnalyticsSaver(AnalyticsModel) {
  if (analyticsSaveIntervalId) {
    clearInterval(analyticsSaveIntervalId);
  }
  AnalyticsModel.findOne().lean().then(dbData => {
    if (dbData && !analyticsCache.has('globalAnalytics')) {
      const plainDbData = { ...dbData };
      if (plainDbData.usedSearchEngines instanceof Map) {
        plainDbData.usedSearchEngines = Object.fromEntries(plainDbData.usedSearchEngines);
      }
      analyticsCache.set('globalAnalytics', plainDbData);
      console.log('[CacheManager] Initial analytics data loaded into cache.');
    }
  }).catch(err => console.error('[CacheManager] Error loading initial analytics:', err));

  analyticsSaveIntervalId = setInterval(() => {
    saveAnalyticsToDB(AnalyticsModel);
  }, ANALYTICS_SAVE_INTERVAL_MS);
  console.log(`[CacheManager] Analytics saver started. Will save to DB every ${ANALYTICS_SAVE_INTERVAL_MS / 60000} minutes.`);
}

console.log('[CacheManager] Initialized in-memory caches.');

module.exports = {
  guildSettingsCache,
  userSettingsCache,
  playlistCache,
  giveawayCache,
  analyticsCache,
  startAnalyticsSaver,
};