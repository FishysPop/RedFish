const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Analytics = require('../../models/Analytics');
const GuildAnalytics = require('../../models/GuildAnalytics');
const { analyticsCache } = require('../../utils/cacheManager');

function truncateEmbedField(str, max = 1024) {
    if (!str) return 'No data';
    if (str.length <= max) return str;
    return str.slice(0, max - 3) + '...';
}

function usedSearchEnginesStringWithPercentages(usedSearchEngines) {
    if (!usedSearchEngines || typeof usedSearchEngines !== 'object') return 'No data';
    const entries = Object.entries(usedSearchEngines);
    const totalSearches = entries.reduce((sum, [, count]) => sum + (count || 0), 0);
    if (totalSearches === 0) return 'No data';

    const formatted = entries
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([engine, count]) => `${engine}: ${count} (${(((count || 0) / totalSearches) * 100).toFixed(2)}%)`)
        .join('\n');

    return truncateEmbedField(formatted, 1024);
}

function topGuildsStringWithPercentages(topGuilds, totalPlays) {
    if (!Array.isArray(topGuilds) || topGuilds.length === 0) return 'No data';

    const formatted = topGuilds
        .map(guild => `${guild.name} (Members: ${guild.memberCount}, Plays: ${guild.playCount}${totalPlays > 0 ? ` (${((guild.playCount / totalPlays) * 100).toFixed(2)}%)` : ''})`)
        .join('\n');

    return truncateEmbedField(formatted, 1024);
}

function aggregateClusterStats({ dbAnalytics = {}, clusterResults = [], topGuildsDb = [] }) {
    let totalGuilds = 0;
    let totalMembers = 0;
    let channelsConnected = 0;
    const guildMap = new Map();

    let totalPlays = dbAnalytics.totalPlayCount || 0;
    let failedPlayCount = dbAnalytics.failedPlayCount || 0;
    let failedSearchCount = dbAnalytics.failedSearchCount || 0;
    let playHasPlayerSettingsCount = dbAnalytics.playHasPlayerSettingsCount || 0;
    let initialEngines = dbAnalytics.usedSearchEngines || {};
    if (initialEngines instanceof Map) {
        initialEngines = Object.fromEntries(initialEngines);
    }
    const enginesObj = { ...initialEngines };

    for (const res of clusterResults) {
        totalGuilds += res.guildCount || 0;
        totalMembers += res.memberCount || 0;
        channelsConnected += res.channelsConnected || 0;

        if (res.foundGuilds) {
            for (const g of res.foundGuilds) {
                guildMap.set(g.guildId, g);
            }
        }

        if (res.localDeltas) {
            totalPlays += res.localDeltas.totalPlayCount || 0;
            failedPlayCount += res.localDeltas.failedPlayCount || 0;
            failedSearchCount += res.localDeltas.failedSearchCount || 0;
            playHasPlayerSettingsCount += res.localDeltas.playHasPlayerSettingsCount || 0;

            if (res.localDeltas.usedSearchEngines) {
                for (const [engine, count] of Object.entries(res.localDeltas.usedSearchEngines)) {
                    enginesObj[engine] = (enginesObj[engine] || 0) + count;
                }
            }
        }
    }

    const topGuilds = topGuildsDb
        .map(dbGuild => {
            const cached = guildMap.get(dbGuild.guildId);
            return {
                name: cached?.name || `Guild (${dbGuild.guildId})`,
                memberCount: cached?.memberCount || 'N/A',
                playCount: dbGuild.playCount || 0,
            };
        })
        .slice(0, 5);

    return {
        totalGuilds,
        totalMembers,
        channelsConnected,
        totalPlays,
        failedPlayCount,
        failedSearchCount,
        playHasPlayerSettingsCount,
        enginesObj,
        topGuilds,
    };
}

const statsCommand = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Shows overall bot statistics'),

    run: async ({ interaction, client }) => {
        try {
            await interaction.deferReply();

            let cachedDbStats = analyticsCache.get('stats_db_cache');
            if (!cachedDbStats) {
                const [analyticsDoc, topGuildsDbDoc] = await Promise.all([
                    Analytics.findOne({}).lean(),
                    GuildAnalytics.find({}).sort({ playCount: -1 }).limit(10).lean()
                ]);
                cachedDbStats = {
                    analytics: analyticsDoc || {
                        totalPlayCount: 0,
                        failedPlayCount: 0,
                        failedSearchCount: 0,
                        playHasPlayerSettingsCount: 0,
                        usedSearchEngines: {}
                    },
                    topGuildsDb: topGuildsDbDoc || []
                };
                analyticsCache.set('stats_db_cache', cachedDbStats, 60);
            }

            const { analytics, topGuildsDb } = cachedDbStats;
            const targetGuildIds = topGuildsDb.map(g => g.guildId);

            let clusterResults = [];
            if (client.cluster) {
                clusterResults = await client.cluster.broadcastEval(async (c, { targetGuildIds }) => {
                    const foundGuilds = [];
                    for (const id of targetGuildIds) {
                        const g = c.guilds.cache.get(id);
                        if (g) {
                            foundGuilds.push({
                                guildId: g.id,
                                name: g.name,
                                memberCount: g.memberCount,
                            });
                        }
                    }

                    const connectedPlayers = c.manager?.players
                        ? Array.from(c.manager.players.values()).filter(p => p.connected).length
                        : 0;
                    const localDeltas = typeof c.cacheManager?.getLocalDeltas === 'function'
                        ? c.cacheManager.getLocalDeltas()
                        : null;

                    return {
                        guildCount: c.guilds.cache.size,
                        memberCount: c.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0),
                        channelsConnected: connectedPlayers,
                        foundGuilds,
                        localDeltas,
                    };
                }, { context: { targetGuildIds } });
            } else {
                const foundGuilds = [];
                for (const id of targetGuildIds) {
                    const g = client.guilds.cache.get(id);
                    if (g) {
                        foundGuilds.push({
                            guildId: g.id,
                            name: g.name,
                            memberCount: g.memberCount,
                        });
                    }
                }
                const connectedPlayers = client.manager?.players
                    ? Array.from(client.manager.players.values()).filter(p => p.connected).length
                    : 0;
                const localDeltas = typeof client.cacheManager?.getLocalDeltas === 'function'
                    ? client.cacheManager.getLocalDeltas()
                    : null;

                clusterResults = [{
                    guildCount: client.guilds.cache.size,
                    memberCount: client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0),
                    channelsConnected: connectedPlayers,
                    foundGuilds,
                    localDeltas,
                }];
            }

            const agg = aggregateClusterStats({
                dbAnalytics: analytics,
                clusterResults,
                topGuildsDb
            });

            const searchErrPct = agg.totalPlays > 0 ? ((agg.failedPlayCount / agg.totalPlays) * 100).toFixed(2) : '0.00';
            const searchFailPct = agg.totalPlays > 0 ? ((agg.failedSearchCount / agg.totalPlays) * 100).toFixed(2) : '0.00';
            const settingsPct = agg.totalPlays > 0 ? ((agg.playHasPlayerSettingsCount / agg.totalPlays) * 100).toFixed(2) : '0.00';

            const embed = new EmbedBuilder()
                .setColor('#e66229')
                .setTitle('Overall Bot Statistics')
                .addFields(
                    { name: 'Total Servers', value: `${agg.totalGuilds.toLocaleString()}`, inline: true },
                    { name: 'Total Users', value: `${agg.totalMembers.toLocaleString()}`, inline: true },
                    { name: 'Channels Connected', value: `${agg.channelsConnected.toLocaleString()}`, inline: true },
                    { name: 'Total Searches', value: `${agg.totalPlays.toLocaleString()}`, inline: true },
                    { name: 'Search Errors', value: `${agg.failedPlayCount.toLocaleString()} (${searchErrPct}%)`, inline: true },
                    { name: 'Failed Searches', value: `${agg.failedSearchCount.toLocaleString()} (${searchFailPct}%)`, inline: true },
                    { name: 'Searches With Settings', value: `${agg.playHasPlayerSettingsCount.toLocaleString()} (${settingsPct}%)`, inline: true },
                    { name: 'Search Engine Usage', value: usedSearchEnginesStringWithPercentages(agg.enginesObj), inline: false },
                    { name: 'Top 5 Guilds', value: topGuildsStringWithPercentages(agg.topGuilds, agg.totalPlays), inline: false }
                )
                .setFooter({
                    text: `Cluster: ${client.cluster?.id ?? 0}/${client.cluster?.count ?? 1} | Shard: ${interaction.guild?.shardId ?? 0}/${client.options?.shardCount ?? 1}`
                });

            interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error while running /stats:", error);
            interaction.editReply('An error occurred while fetching stats.');
        }
    },
    usedSearchEnginesStringWithPercentages,
    topGuildsStringWithPercentages,
    truncateEmbedField,
    aggregateClusterStats
};

module.exports = statsCommand;