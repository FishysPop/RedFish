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
    if (!queue || !queue.isPlaying()) {
      interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
      return;
  }
    try {
      let repeatMode = queue.repeatMode;
      if (repeatMode === 0) {
        const embed = new EmbedBuilder()
        .setColor('#e66229')
        .setDescription(`**Autoplay enabled**`).setFooter({ text:`Run this command again to disable it.`})
          interaction.reply({ embeds: [embed] });
          queue.setRepeatMode(3);
          
  } else {
    const embed2 = new EmbedBuilder()
    .setColor('#e66229')
    .setDescription(`**Autoplay disabled**`).setFooter({ text:`Run this command again to enable it.`})
      interaction.reply({ embeds: [embed2] });
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
