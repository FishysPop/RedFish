const { Client, GuildMember } = require('discord.js');

module.exports = async (guild, client ,handler) => {
    console.log(`New Guild: ${guild.name}(${guild.id}), Members: ${guild.memberCount}`)
};