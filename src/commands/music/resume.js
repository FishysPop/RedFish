const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("resume or pause a song."),

  run: ({ interaction, client, handler }) => {
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
        interaction.reply(`${interaction.user.username}#${interaction.user.discriminator} has paused the queue.`)
        queue.node.pause()
        
    } else {
        interaction.reply(`${interaction.user.username}#${interaction.user.discriminator} has resumed the queue.`)
        queue.node.resume();
    }
    
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
