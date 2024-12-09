const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Analytics = require('../../models/Analytics');
const { Player } = require('discord-player');


let player;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Shows overall bot statistics'),

    run: async ({ interaction, client }) => {
        try {
            await interaction.deferReply();
            const analytics = await Analytics.findOne({}).lean(); 
            if (!analytics) return interaction.editReply('No analytics data found.');
            let channelsConnected = 0;
            let topGuildsData = []; 
            if (client.cluster) {
                const results = await client.cluster.broadcastEval(async (c) => {
                    let localChannelsConnected = 0;
                    let localTopGuilds = [];

                    if (c.playerType === 'discord_player' || c.playerType === 'both') {
                        const player = useMainPlayer();
                        const playerStats = player.generateStatistics();
                        localChannelsConnected = playerStats.queues.length;
                    } else {
                        localChannelsConnected = c.manager.players.size;
                    }

                    // Retrieve essential guild data in each shard/worker
                    localTopGuilds = c.guilds.cache.map(guild => ({
                        guildId: guild.id,
                        name: guild.name,
                        memberCount: guild.memberCount,
                    }));

                    return {
                        channelsConnected: localChannelsConnected,
                        topGuilds: localTopGuilds,
                    };
                });

                for (const result of results) {
                    channelsConnected += result.channelsConnected;
                    topGuildsData = topGuildsData.concat(result.topGuilds);
                }
            }
            const totalPlays = analytics.totalPlayCount;
            const topGuilds = topGuildsData
                .map(guildData => {
                    const guildPlayCount = analytics.guildPlayCount.find(g => g.guildId === guildData.guildId);
                    return {
                        name: guildData.name,
                        memberCount: guildData.memberCount,
                        playCount: guildPlayCount?.playCount || 0,
                    };
                })
                .sort((a, b) => b.playCount - a.playCount)
                .slice(0, 5);

            const embed = new EmbedBuilder()
                .setColor('#e66229')
                .setTitle('Overall Bot Statistics')
                .addFields(
                    { name: 'Total Searches', value: `${totalPlays.toLocaleString()}`, inline: true },
                    { name: 'Failed Searches', value: `${analytics.failedPlayCount.toLocaleString()} (${((analytics.failedPlayCount / totalPlays) * 100).toFixed(2) || 0}%)`, inline: true },
                    { name: 'Search Errors', value: `${analytics.failedSearchCount.toLocaleString()} (${((analytics.failedSearchCount / totalPlays) * 100).toFixed(2) || 0}%)`, inline: true },
                    { name: 'Searches With Settings', value: `${analytics.playHasPlayerSettingsCount.toLocaleString()} (${((analytics.playHasPlayerSettingsCount / (totalPlays > 0 ? totalPlays : client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)) ) * 100).toFixed(2)}%)`, inline: true },
                    { name: 'Channels Connected', value: `${channelsConnected}`, inline: true },
                    { name: 'Search Engine Usage', value: usedSearchEnginesStringWithPercentages(analytics.usedSearchEngines), inline: false }, 
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
    const totalSearches = Object.values(usedSearchEngines).reduce((sum, count) => sum + count, 0);
    if (totalSearches === 0) return 'No data';

    return Object.entries(usedSearchEngines)
        .sort(([, countA], [, countB]) => countB - countA) // Sort by count (descending)
        .map(([engine, count]) => `${engine}: ${count} (${((count / totalSearches) * 100).toFixed(2)}%)`)
        .join('\n');
}

function topGuildsStringWithPercentages(topGuilds, totalPlays) {
    if(topGuilds.length === 0) return "No data"

    return topGuilds.map(guild => `${guild.name} (Members: ${guild.memberCount}, Plays: ${guild.playCount} (${((guild.playCount / totalPlays) * 100).toFixed(2)}%))`).join('\n');

}