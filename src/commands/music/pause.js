const { EmbedBuilder , SlashCommandBuilder } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("pause or resume a song."),

  run: async ({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });
     return;
    }
    const queue = useQueue(interaction.guildId)
    if (!interaction.member.voice.channel) {
      interaction.reply({content: 'You are not connected to a voice channel.',ephemeral: true})
      return;
  }
  if (!queue || !queue.isPlaying()) {
      interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
      return;
  }
    let playing = !queue.node.isPaused();
    if (playing) {
      const PlayerPauseEmbed = await new EmbedBuilder() 
      .setColor('#e66229')
        .setDescription(`${interaction.user} has paused the queue.`)
      interaction.reply({ embeds: [PlayerPauseEmbed]})
        queue.node.pause()
        
    } else {
      const PlayerResumedEmbed = await new EmbedBuilder() 
      .setColor('#e66229')
        .setDescription(`${interaction.user} has resumed the queue.`)
      interaction.reply({ embeds: [PlayerResumedEmbed]})
        queue.node.resume();
    }
    
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
