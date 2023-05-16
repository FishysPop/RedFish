const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue, useTimeline } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Shows info about the current song."),


  run: async({ interaction, client, handler }) => {
    const queue = useQueue(interaction.guildId);
    const timeline = useTimeline(interaction.guildId);
  
    if (!queue)
      return interaction.reply({
        content: `There is nothing playing`,
        ephemeral: true,
      });
    if (!queue.currentTrack)
      return interaction.reply({
        content: `There is no track currently playing`,
        ephemeral: true,
      });
      console.log(queue)
      let autoPlayEmoji = '❌'
      let repeatModeEmoji = '❌'
    const track = queue.currentTrack;
     if (queue.repeatMode === 2) {
         repeatModeEmoji = '✅'
    } 
    if (queue.repeatMode === 3) {
        autoPlayEmoji = '✅'
   } 
    const requestedByString = track.requestedBy.username
      ? `${track.requestedBy.username}#${track.requestedBy.discriminator}`
      : "Someone";
    const embed = await new EmbedBuilder()
	  .setAuthor({ name: 'Now Playing'})
      .setColor('#e66229')
      .setTitle(track.title)
      .setURL(track.url)
      .setDescription(`By: **${track.author}**`)
      .setThumbnail(track.thumbnail)
      .setTimestamp()
      .addFields([
        {
            name: "Progress",
            value: `${queue.node.createProgressBar()} (${
              timeline.timestamp.progress
            }%)`,
          },        
        { name: "Settings", value: `Loop: ${repeatModeEmoji} AutoPlay: ${autoPlayEmoji}` },

      ])
      .setFooter({ text: `Requested by ${requestedByString}` });

    return interaction.reply({ embeds: [embed] });
  },


  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
