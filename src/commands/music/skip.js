const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips a song."),

  run: ({ interaction, client, handler }) => {
   const queue = useQueue(interaction.guildId)
   if (!queue || !queue.isPlaying()) {
    interaction.reply({content: 'You are not connected to a voice channel',ephemeral: true})
   } else {
    queue.node.skip()
    interaction.reply("Track Skipped")
   }
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
