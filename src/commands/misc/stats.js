const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Analytics = require('../../models/Analytics');
const { useMainPlayer, Player } = require('discord-player');

let player; // Declare player at higher scope

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Shows overall bot statistics'),

    run: async ({ interaction, client }) => {
        try {
            await interaction.deferReply();
            const analytics = await Analytics.findOne({});
            if (!analytics) return interaction.editReply('No analytics data found.');
    
            if (!player) player = new Player(client);
            const playerStats = player.generateStatistics();
            const channelsConnected = playerStats.queues.length;
    
            const topGuilds = analytics.guildPlayCount // Start with the data you already have
            .sort((a, b) => b.playCount - a.playCount) // Sort by play count
            .slice(0, 5) // Take the top 5
            .map(guildData => { // Map only the top 5
                const guild = client.guilds.cache.get(guildData.guildId);
                return {
                    name: guild ? guild.name : "Unknown Guild", // Handle cases where the guild is no longer in the cache
                    memberCount: guild ? guild.memberCount : "N/A",
                    playCount: guildData.playCount
                };
            });
    
            let topGuildsString = '';
            topGuilds.forEach(guild => {
                topGuildsString += `${guild.name} (Members: ${guild.memberCount}, Plays: ${guild.playCount})\n`;
            });
            if (topGuildsString === '') topGuildsString = 'No data';
            const embed = new EmbedBuilder()
                .setColor('#e66229')
                .setTitle('Overall Bot Statistics')
                .addFields(
                    { name: 'Total Plays', value: analytics.totalPlayCount.toLocaleString(), inline: true },
                    { name: 'Failed Plays', value: analytics.failedPlayCount.toLocaleString(), inline: true },
                    { name: 'Failed Searches', value: analytics.failedSearchCount.toLocaleString(), inline: true },
                    { name: 'Players with Custom Settings', value: analytics.playHasPlayerSettingsCount.toLocaleString(), inline: true },
                    { name: 'Channels Connected', value: channelsConnected.toLocaleString(), inline: true },
                    { name: 'Search Engine Usage', value: [...analytics.usedSearchEngines.entries()].map(([engine, count]) => `${engine}: ${count}`).join('\n') || 'No data', inline: false },
                    { name: 'Top 5 Guilds', value: topGuildsString, inline: false } 
                );


            interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Error while running /stats:", error);
            interaction.editReply('An error occurred while fetching stats.');
        }
    },
};
