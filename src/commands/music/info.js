const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { useQueue, useTimeline } = require('discord-player');
const { convertTime } = require("../../utils/ConvertTime.js");

module.exports =  {
    data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Shows info about the current song."),
    
  run: async({ interaction, client, handler }) => {
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
      let autoPlayEmoji = '❌'
      let repeatModeEmoji = '❌'
      function createProgressBar(currentPosition, totalLength, options = {}) {
        const { indicator = '\u{1F518}', leftChar = '\u25AC', rightChar = '\u25AC', length = 15, timecodes = true, separator = '\u2503' } = options;
      
        if (isNaN(length) || length < 0 || !Number.isFinite(length)) {
          throw new Error(`Invalid progress bar length: ${length}`);
        }
      
        const index = Math.round((currentPosition / totalLength) * length);
      
        if (index >= 1 && index <= length) {
          const bar = leftChar.repeat(index - 1).split('');
          bar.push(indicator);
          bar.push(rightChar.repeat(length - index));
      
          if (timecodes) {
            // Assuming you have functions to format timestamps
            const formattedCurrentTime = convertTime(currentPosition);
            const formattedTotalTime = convertTime(totalLength);
            return `${formattedCurrentTime} ${separator} ${bar.join('')} ${separator} ${formattedTotalTime}`;
          } else {
            return bar.join('');
          }
        } else {
          if (timecodes) {
            // Assuming you have functions to format timestamps
            const formattedCurrentTime = convertTime(currentPosition);
            const formattedTotalTime = convertTime(totalLength);
            return `${formattedCurrentTime} ${separator} ${indicator}${rightChar.repeat(length - 1)} ${separator} ${formattedTotalTime}`;
          } else {
            return `${indicator}${rightChar.repeat(length - 1)}`;
          }
        }
      }
    switch (client.playerType) {
      case "both":
        const Lavaplayer = client.manager.players.get(interaction.guild.id);
        const Discordplayer = useQueue(interaction.guild.id)
        if (!Lavaplayer && !Discordplayer) {
         return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
        }
        if (Discordplayer) {
          const timeline = useTimeline(interaction.guildId);
  
          const track = Discordplayer.currentTrack;
           if (Discordplayer.repeatMode === 2) {
               repeatModeEmoji = '✅'
          } 
          if (Discordplayer.repeatMode === 3) {
              autoPlayEmoji = '✅'
         } 
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
                  value: `${Discordplayer.node.createProgressBar()} (${
                    timeline.timestamp.progress
                  }%)`,
                },        
              { name: "Settings", value: `Loop: ${repeatModeEmoji} AutoPlay: ${autoPlayEmoji}` },
      
            ])
            .setFooter({ text: `Requested by ${track.requestedBy?.username}` });
      
          return interaction.reply({ embeds: [embed] });
        } else if (Lavaplayer) {
          if (Lavaplayer.queue.length === 0) {
            return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
           }
          const currentTrack = Lavaplayer.queue.current
          const currentPos = Lavaplayer.queue.kazagumoPlayer.shoukaku.position ; 
          const songLength = Lavaplayer.queue.current.length; 
          if (Lavaplayer.loop === "queue") {
           repeatModeEmoji = '✅'
          } 
        if (Lavaplayer.customData.autoPlay === true) {
           autoPlayEmoji = '✅'
          }         
          const embed2 = await new EmbedBuilder()
          .setAuthor({ name: 'Now Playing'})
            .setColor('#e66229')
            .setTitle(currentTrack.title)
            .setURL(currentTrack.uri)
            .setDescription(`By: **${currentTrack.author}**`)
            .setThumbnail(currentTrack.thumbnail)
            .setTimestamp()
            .addFields([
             {
                 name: "Progress",
                 value: `${createProgressBar(currentPos, songLength)} (${
                   ((currentPos / 1000) / (songLength / 1000) * 100).toFixed(0)
                 }%)`,
               },   
              { name: "Settings", value: `Loop: ${repeatModeEmoji} AutoPlay: ${autoPlayEmoji}` },
      
            ])
            .setFooter({ text: `Requested by ${currentTrack.requester.username}` });
      
          return interaction.reply({ embeds: [embed2] });
        } else {
          return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
        }
      break;
      case "lavalink":
        const player = client.manager.players.get(interaction.guild.id);
        if (!player) {
          return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
         }
         if (!player.playing) {
          return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
         }
         const currentTrack = player.queue.current
         const currentPos = player.queue.kazagumoPlayer.shoukaku.position ; 
         const songLength = player.queue.current.length; 
         if (player.loop === "queue") {
          repeatModeEmoji = '✅'
         } 
       if (player.customData.autoPlay === true) {
          autoPlayEmoji = '✅'
         }         
         const embed2 = await new EmbedBuilder()
         .setAuthor({ name: 'Now Playing'})
           .setColor('#e66229')
           .setTitle(currentTrack.title)
           .setURL(currentTrack.uri)
           .setDescription(`By: **${currentTrack.author}**`)
           .setThumbnail(currentTrack.thumbnail)
           .setTimestamp()
           .addFields([
            {
                name: "Progress",
                value: `${createProgressBar(currentPos, songLength)} (${
                  ((currentPos / 1000) / (songLength / 1000) * 100).toFixed(0)
                }%)`,
              },   
             { name: "Settings", value: `Loop: ${repeatModeEmoji} AutoPlay: ${autoPlayEmoji}` },
     
           ])
           .setFooter({ text: `Requested by ${currentTrack.requester.username} | Node: ${player.queue.kazagumoPlayer.shoukaku.node.name}` });
     
         return interaction.reply({ embeds: [embed2] });
   
      break;
      case "discord_player":
        const queue = useQueue(interaction.guildId)
        if (!queue || !queue.isPlaying()) {
          interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
          return;
      }
      const timeline = useTimeline(interaction.guildId);
  
      const track = queue.currentTrack;
       if (queue.repeatMode === 2) {
           repeatModeEmoji = '✅'
      } 
      if (queue.repeatMode === 3) {
          autoPlayEmoji = '✅'
     } 
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
        .setFooter({ text: `Requested by ${track.requestedBy?.username}` });
  
      return interaction.reply({ embeds: [embed] });
      break;
    }
  },


  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
