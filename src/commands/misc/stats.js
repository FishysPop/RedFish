const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Analytics = require('../../models/Analytics');
const GuildAnalytics = require('../../models/GuildAnalytics');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Shows overall bot statistics'),

    run: async ({ interaction, client }) => {
        try {
            await interaction.deferReply();
            const [analytics, topGuildsDb] = await Promise.all([
                Analytics.findOne({}).lean(),
                GuildAnalytics.find({}).sort({ playCount: -1 }).limit(10).lean()
            ]);

            if (!analytics) return interaction.editReply('No analytics data found.');

            let channelsConnected = 0;
            const guildMap = new Map();
            const targetGuildIds = topGuildsDb.map(g => g.guildId);

            if (client.cluster) {
                const results = await client.cluster.broadcastEval(async (c, { targetGuildIds }) => {
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
                    return {
                        channelsConnected: c.manager?.players.size || 0,
                        foundGuilds,
                    };
                }, { context: { targetGuildIds } });

                for (const result of results) {
                    channelsConnected += result.channelsConnected || 0;
                    if (result.foundGuilds) {
                        for (const g of result.foundGuilds) {
                            guildMap.set(g.guildId, g);
                        }
                    }
                }
            } else {
                channelsConnected = client.manager?.players.size || 0;
                for (const id of targetGuildIds) {
                    const g = client.guilds.cache.get(id);
                    if (g) {
                        guildMap.set(g.id, {
                            guildId: g.id,
                            name: g.name,
                            memberCount: g.memberCount,
                        });
                    }
                }
            }

            const totalPlays = analytics.totalPlayCount || 0;
            const failedPlayCount = analytics.failedPlayCount || 0;
            const failedSearchCount = analytics.failedSearchCount || 0;
            const playHasPlayerSettingsCount = analytics.playHasPlayerSettingsCount || 0;

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

            let enginesObj = analytics.usedSearchEngines || {};
            if (enginesObj instanceof Map) {
                enginesObj = Object.fromEntries(enginesObj);
            }

            const searchErrPct = totalPlays > 0 ? ((failedPlayCount / totalPlays) * 100).toFixed(2) : '0.00';
            const searchFailPct = totalPlays > 0 ? ((failedSearchCount / totalPlays) * 100).toFixed(2) : '0.00';
            const settingsPct = totalPlays > 0 ? ((playHasPlayerSettingsCount / totalPlays) * 100).toFixed(2) : '0.00';

            const embed = new EmbedBuilder()
                .setColor('#e66229')
                .setTitle('Overall Bot Statistics')
                .addFields(
                    { name: 'Total Searches', value: `${totalPlays.toLocaleString()}`, inline: true },
                    { name: 'Search Errors', value: `${failedPlayCount.toLocaleString()} (${searchErrPct}%)`, inline: true },
                    { name: 'Failed Searches', value: `${failedSearchCount.toLocaleString()} (${searchFailPct}%)`, inline: true },
                    { name: 'Searches With Settings', value: `${playHasPlayerSettingsCount.toLocaleString()} (${settingsPct}%)`, inline: true },
                    { name: 'Channels Connected', value: `${channelsConnected}`, inline: true },
                    { name: 'Search Engine Usage', value: usedSearchEnginesStringWithPercentages(enginesObj), inline: false },
                    { name: 'Top 5 Guilds', value: topGuildsStringWithPercentages(topGuilds, totalPlays), inline: false }
                );

            interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error while running /stats:", error);
            interaction.editReply('An error occurred while fetching stats.');
        }
    },
};

function usedSearchEnginesStringWithPercentages(usedSearchEngines) {
    const entries = Object.entries(usedSearchEngines);
    const totalSearches = entries.reduce((sum, [, count]) => sum + (count || 0), 0);
    if (totalSearches === 0) return 'No data';

    return entries
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([engine, count]) => `${engine}: ${count} (${(((count || 0) / totalSearches) * 100).toFixed(2)}%)`)
        .join('\n');
}

function topGuildsStringWithPercentages(topGuilds, totalPlays) {
    if (topGuilds.length === 0) return "No data";

    return topGuilds
        .map(guild => `${guild.name} (Members: ${guild.memberCount}, Plays: ${guild.playCount}${totalPlays > 0 ? ` (${((guild.playCount / totalPlays) * 100).toFixed(2)}%)` : ''})`)
        .join('\n');
}