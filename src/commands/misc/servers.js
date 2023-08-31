const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('servers')
    .setDescription('List all servers the bot is in'),

  run: async ({ interaction, client }) => {
    await interaction.deferReply();

    const guilds = client.guilds.cache.map(guild => ({
      name: guild.name,
      id: guild.id
    }));

    const guildList = guilds.map(guild => `Server Name: ${guild.name} | Server ID: ${guild.id}`).join('\n');

    interaction.editReply(`List of servers the bot is in:\n${guildList}`);
  },
};
