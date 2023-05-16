const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, italic } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Plays songs based on the current queue"),


  run: async({ interaction, client, handler }) => {
    const queue = useQueue(interaction.guildId)
    const user = interaction.user.username
    const discriminator = interaction.user.discriminator
    try {
      let repeatMode = queue.repeatMode;
      if (repeatMode === 0) {
          interaction.reply(`${user}#${discriminator} has enabled autoplay | Do this command again to disable autoplay.`)
          queue.setRepeatMode(3);
      
          
  } else {
         interaction.reply(`${user}#${discriminator} has disabled autoplay.`)
          queue.setRepeatMode(0);
      } } catch {
          interaction.reply({content: `There is no music playing`,ephemeral: true,})
      }
   return;
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true
    }
};
