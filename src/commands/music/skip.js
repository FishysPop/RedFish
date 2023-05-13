const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, italic } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips a song."),


  run: async({ interaction, client, handler }) => {
   const queue = useQueue(interaction.guildId)
   try {
    queue.node.skip()
    interaction.reply("Track Skipped")
   } catch {
    interaction.reply("There is no music playing")
   }
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
