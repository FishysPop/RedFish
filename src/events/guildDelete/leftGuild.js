const GuildAnalytics = require('../../models/GuildAnalytics');

module.exports = async (guild, client, handler) => {
    console.log(`Kicked Guild: ${guild.name}(${guild.id}), Members: ${guild.memberCount}`);
    if (guild?.id) {
        await GuildAnalytics.deleteOne({ guildId: guild.id }).catch(err => {
            console.error(`Failed to delete guild analytics for left guild ${guild.id}:`, err);
        });
    }
};