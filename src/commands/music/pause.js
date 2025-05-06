const { EmbedBuilder , SlashCommandBuilder, MessageFlags } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("pause or resume a song."),

  run: async ({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        flags: MessageFlags.Ephemeral,
      });
     return;
    }
    if (!interaction.member.voice.channel) {
      interaction.reply({content: 'You are not connected to a voice channel.', flags: MessageFlags.Ephemeral})
      return;
  } 
    let playing
    switch (client.playerType) {
      case "both":
        const Lavaplayer = client.manager.players.get(interaction.guild.id);
        const Discordplayer = useQueue(interaction.guild.id)
        if (!Lavaplayer && !Discordplayer) {
         return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
        }
        if (Discordplayer) {
          let playing = !Discordplayer.node.isPaused();
          if (playing) {
            const PlayerPauseEmbed = await new EmbedBuilder() 
            .setColor('#e66229')
              .setDescription(`${interaction.user} has paused the queue.`)
            interaction.reply({ embeds: [PlayerPauseEmbed]})
            Discordplayer.node.pause()
              
          } else {
            const PlayerResumedEmbed = await new EmbedBuilder() 
            .setColor('#e66229')
              .setDescription(`${interaction.user} has resumed the queue.`)
            interaction.reply({ embeds: [PlayerResumedEmbed]})
            Discordplayer.node.resume();
          }
        } else if (Lavaplayer) {
          playing = Lavaplayer.paused
          if (!playing) {
            const PlayerPauseEmbed = await new EmbedBuilder() 
            .setColor('#e66229')
              .setDescription(`${interaction.user} has paused the queue.`)
            interaction.reply({ embeds: [PlayerPauseEmbed]})
            Lavaplayer.pause(true);
              
          } else {
            const PlayerResumedEmbed = await new EmbedBuilder() 
            .setColor('#e66229')
              .setDescription(`${interaction.user} has resumed the queue.`)
            interaction.reply({ embeds: [PlayerResumedEmbed]})
            Lavaplayer.pause(false);
          }
        } else {
          return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
        }
      break;
      case "lavalink":
        const player = client.manager.players.get(interaction.guild.id);
        if (!player) {
          return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
         }
         playing = player.paused
         if (!playing) {
           const PlayerPauseEmbed = await new EmbedBuilder() 
           .setColor('#e66229')
             .setDescription(`${interaction.user} has paused the queue.`)
           interaction.reply({ embeds: [PlayerPauseEmbed]})
           player.pause(true);
             
         } else {
           const PlayerResumedEmbed = await new EmbedBuilder() 
           .setColor('#e66229')
             .setDescription(`${interaction.user} has resumed the queue.`)
           interaction.reply({ embeds: [PlayerResumedEmbed]})
           player.pause(false);
         }
      break;
      case "discord_player":
        const queue = useQueue(interaction.guildId)
        if (!queue || !queue.isPlaying()) {
          interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
          return;
      }
       playing = !queue.node.isPaused();
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
      break;
    }


  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
