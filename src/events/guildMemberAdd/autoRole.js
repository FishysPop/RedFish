const { Client, GuildMember } = require('discord.js');
const AutoRole = require('../../models/AutoRole');

module.exports = async (member, client ,handler) => {
  try {
    let guild = member.guild;
    if (!guild) return;

    const autoRole = await AutoRole.findOne({ guildId: guild.id });
    if (!autoRole) return;

    await member.roles.add(autoRole.roleId);
  } catch (error) {
    console.log(`Error giving role automatically: ${error}, Guild: (${member.guild.name})[${member.guild.id}]`);
  }
};