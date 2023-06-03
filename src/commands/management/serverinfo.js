const {SlashCommandBuilder,} = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
  .setName('serverinfo')
  .setDescription('Shows information about this server'),


  run: async ({ interaction, client, handler }) => {
   interaction.deferReply
  },
  // devOnly: Boolean,
  //testOnly: true,
  //deleted: true,
};
