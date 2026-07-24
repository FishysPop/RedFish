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

let _client = null;
let analyticsIntervalId = null;
const ANALYTICS_SYNC_INTERVAL_MS = 60 * 1000;

let localDeltas = {
  totalPlayCount: 0,
  playHasPlayerSettingsCount: 0,
  failedPlayCount: 0,
  failedSearchCount: 0,
  usedSearchEngines: {},
  guildPlayCount: {},
};

function initializeCacheManager(clientInstance) {
  _client = clientInstance;
}

function updatePlayAnalytics({ guildId, hasPlayerSettings, usedSearchEngine, errorType } = {}) {
  try {
    if (errorType) {
      if (errorType === 'playError') localDeltas.failedPlayCount += 1;
      else if (errorType === 'noResults') localDeltas.failedSearchCount += 1;
    } else {
      localDeltas.totalPlayCount += 1;
      if (hasPlayerSettings) localDeltas.playHasPlayerSettingsCount += 1;
      if (usedSearchEngine) {
        const sanitizedEngine = String(usedSearchEngine).replace(/\./g, '_');
        localDeltas.usedSearchEngines[sanitizedEngine] = (localDeltas.usedSearchEngines[sanitizedEngine] || 0) + 1;
      }
      if (guildId) {
        localDeltas.guildPlayCount[guildId] = (localDeltas.guildPlayCount[guildId] || 0) + 1;
      }
    }
  } catch (error) {
    console.error("[CacheManager] Error updating local analytics deltas:", error);
  }
}

async function flushAnalyticsToDB(AnalyticsModel, GuildAnalyticsModel) {
  if (!AnalyticsModel) return;

  const currentDeltas = localDeltas;
  localDeltas = {
    totalPlayCount: 0,
    playHasPlayerSettingsCount: 0,
    failedPlayCount: 0,
    failedSearchCount: 0,
    usedSearchEngines: {},
    guildPlayCount: {},
  };

  const hasGlobalDeltas = currentDeltas.totalPlayCount > 0 ||
    currentDeltas.playHasPlayerSettingsCount > 0 ||
    currentDeltas.failedPlayCount > 0 ||
    currentDeltas.failedSearchCount > 0 ||
    Object.keys(currentDeltas.usedSearchEngines).length > 0;

  const guildEntries = Object.entries(currentDeltas.guildPlayCount);

  if (!hasGlobalDeltas && guildEntries.length === 0) return;

  try {
    const promises = [];

    if (hasGlobalDeltas) {
      const incObject = {};
      if (currentDeltas.totalPlayCount > 0) incObject.totalPlayCount = currentDeltas.totalPlayCount;
      if (currentDeltas.playHasPlayerSettingsCount > 0) incObject.playHasPlayerSettingsCount = currentDeltas.playHasPlayerSettingsCount;
      if (currentDeltas.failedPlayCount > 0) incObject.failedPlayCount = currentDeltas.failedPlayCount;
      if (currentDeltas.failedSearchCount > 0) incObject.failedSearchCount = currentDeltas.failedSearchCount;

      for (const [engine, count] of Object.entries(currentDeltas.usedSearchEngines)) {
        if (count > 0) {
          incObject[`usedSearchEngines.${engine}`] = count;
        }
      }

      promises.push(AnalyticsModel.updateOne({}, { $inc: incObject }, { upsert: true }));
    }

    if (GuildAnalyticsModel && guildEntries.length > 0) {
      const bulkOps = guildEntries.map(([guildId, count]) => ({
        updateOne: {
          filter: { guildId },
          update: { $inc: { playCount: count } },
          upsert: true
        }
      }));
      promises.push(GuildAnalyticsModel.bulkWrite(bulkOps));
    }

    await Promise.all(promises);
  } catch (error) {
    console.error('[CacheManager] Error flushing analytics deltas to DB:', error);
  }
}

async function _migrateLegacyGuildAnalytics(AnalyticsModel, GuildAnalyticsModel) {
  try {
    if (!AnalyticsModel || !GuildAnalyticsModel) return;
    const dbData = await AnalyticsModel.findOne({}).lean();
    if (dbData && Array.isArray(dbData.guildPlayCount) && dbData.guildPlayCount.length > 0) {
      const bulkOps = dbData.guildPlayCount.map(g => ({
        updateOne: {
          filter: { guildId: g.guildId },
          update: { $inc: { playCount: g.playCount || 0 } },
          upsert: true
        }
      }));
      if (bulkOps.length > 0) {
        await GuildAnalyticsModel.bulkWrite(bulkOps);
      }
      await AnalyticsModel.updateOne({}, { $unset: { guildPlayCount: "" } });
    }
  } catch (error) {
    console.error('[CacheManager] Error migrating legacy guild analytics:', error);
  }
}

function startAnalyticsProcessor(AnalyticsModel, GuildAnalyticsModel) {
  if (analyticsIntervalId) {
    clearInterval(analyticsIntervalId);
  }

  const isMainCluster = !_client || !_client.cluster || (_client.cluster.id === 0);
  if (isMainCluster) {
    _migrateLegacyGuildAnalytics(AnalyticsModel, GuildAnalyticsModel);
  }

  analyticsIntervalId = setInterval(() => {
    flushAnalyticsToDB(AnalyticsModel, GuildAnalyticsModel);
  }, ANALYTICS_SYNC_INTERVAL_MS);

  const cleanup = () => {
    flushAnalyticsToDB(AnalyticsModel, GuildAnalyticsModel);
  };

  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
}

function handleIncomingAnalyticsUpdate() {}

module.exports = {
  guildSettingsCache,
  userSettingsCache,
  playlistCache,
  giveawayCache,
  analyticsCache,
  initializeCacheManager,
  startAnalyticsProcessor,
  flushAnalyticsToDB,
  updatePlayAnalytics,
  handleIncomingAnalyticsUpdate,
};
