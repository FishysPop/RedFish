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

            if (!player) player = new Player(client);
            const totalPlays = analytics.totalPlayCount;
            const playerStats = player.generateStatistics();
            const channelsConnected = playerStats.queues.length;

            const topGuilds = analytics.guildPlayCount
                .sort((a, b) => b.playCount - a.playCount)
                .filter(guildData => client.guilds.cache.has(guildData.guildId)) 
                .slice(0, 5)
                .map(guildData => {
                    const guild = client.guilds.cache.get(guildData.guildId);
                    return {
                        name: guild.name,
                        memberCount: guild.memberCount,
                        playCount: guildData.playCount
                    };
                });

            const embed = new EmbedBuilder()
                .setColor('#e66229')
                .setTitle('Overall Bot Statistics')
                .addFields(
                    { name: 'Total Plays', value: `${totalPlays.toLocaleString()}`, inline: true },
                    { name: 'Failed Plays', value: `${analytics.failedPlayCount.toLocaleString()} (${((analytics.failedPlayCount / totalPlays) * 100).toFixed(2) || 0}%)`, inline: true },
                    { name: 'Failed Searches', value: `${analytics.failedSearchCount.toLocaleString()} (${((analytics.failedSearchCount / totalPlays) * 100).toFixed(2) || 0}%)`, inline: true },
                    { name: 'Players with Custom Settings', value: `${analytics.playHasPlayerSettingsCount.toLocaleString()} (${((analytics.playHasPlayerSettingsCount / (totalPlays > 0 ? totalPlays : client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)) ) * 100).toFixed(2)}%)`, inline: true },
                    { name: 'Channels Connected', value: `${channelsConnected.toLocaleString()}`, inline: true },
                    { name: 'Search Engine Usage', value: usedSearchEnginesStringWithPercentages(analytics.usedSearchEngines), inline: false }, // Use helper function
                    { name: 'Top 5 Guilds', value: topGuildsStringWithPercentages(topGuilds, totalPlays), inline: false } // Use helper function
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