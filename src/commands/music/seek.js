const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("Skip a time of a song")
    .addIntegerOption((option) => option.setName("seconds").setDescription("The amount of seconds to seek to.").setRequired(true)),

  run: ({ interaction, client, handler }) => {
    const seconds = interaction.options.getInteger("seconds")
    const queue = useQueue(interaction.guildId)
    if (!queue || !queue.isPlaying()) {
      interaction.reply({content: 'You are not connected to a voice channel',ephemeral: true,})
      return;
    } 
      queue.node.seek(seconds * 1000);
     interaction.reply(`Seeked ${seconds} seconds`)
    
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
