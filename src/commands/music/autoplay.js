const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Plays songs based on the current queue"),


  run: async({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });
     return;
    }
    const queue = useQueue(interaction.guildId)
    const user = interaction.user.username
    const discriminator = interaction.user.discriminator
    try {
      let repeatMode = queue.repeatMode;
      if (repeatMode === 0) {
        const embed = new EmbedBuilder()
        .setColor('#e66229')
        .setDescription(`**Autoplay enabled**`).setFooter({ text:`Run this command again to disable it.`})
          interaction.reply({ embeds: [embed] });
          queue.setRepeatMode(3);
      
          
  } else {
         interaction.reply(`${user}#${discriminator} has disabled autoplay.`)
          queue.setRepeatMode(0);
      } } catch (error) {
          interaction.reply({content: `There is no music playing`,ephemeral: true,})
          console.log(error)
      }
   return;
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true
    }
};
