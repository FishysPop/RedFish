const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, italic } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("Skip a time of a song"),


  run: async({ interaction, client, handler }) => {
    interaction.reply("Coming soon")

  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
