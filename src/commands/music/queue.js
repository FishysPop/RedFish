const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, italic } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Shows all the current songs in queue"),


  run: ({ interaction, client, handler }) => {
   const queue = useQueue(interaction.guildId)
   try {
    queue.delete();
    interaction.reply("Disconnected")
   } catch {
    interaction.reply("There is no music playing")
   }
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
