const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle ,ActionRowBuilder, MessageFlags} = require("discord.js");
const { useQueue } = require('discord-player');
const { convertTime } = require("../../utils/ConvertTime.js");

module.exports =  {
    data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Shows all the current songs in queue"),

  run: async ({ interaction, client, handler }) =>  {
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
  let embeds = [];
  const chunkSize = 10;
  let pages  = 0;
  let currentIndex = 0;
  const prevButton = new ButtonBuilder()
  .setCustomId("prev")
  .setStyle(ButtonStyle.Secondary)
  .setEmoji("⬅️");

const nextButton = new ButtonBuilder()
  .setCustomId("next")
  .setStyle(ButtonStyle.Secondary)
  .setEmoji("➡️");

const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

  switch (client.playerType) {
    case "both":
      const Lavaplayer = client.manager.players.get(interaction.guild.id);
      const Discordplayer = useQueue(interaction.guild.id)
      if (!Lavaplayer && !Discordplayer) {
       return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
      }
      if (Discordplayer) {
        const formatTracks = Discordplayer.tracks.toArray();

        if (formatTracks.length === 0) {
          return interaction.reply({
            content: `There aren't any other tracks in the queue. Use **/info** to show information about the current track.`,
            flags: MessageFlags.Ephemeral,
          });
        }
    
        const tracks = formatTracks.map(
          (track, idx) => `**${idx + 1}.** [${track.title}](${track.url}) - ${track.author} | ${track.requestedBy}`
        );
        
        pages = Math.ceil(tracks.length / chunkSize);
    
        for (let i = 0; i < pages; i++) {
          const start = i * chunkSize;
          const end = start + chunkSize;
    
          const embed = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Tracks Queue")
            .setDescription(
              tracks.slice(start, end).join("\n") || "**No queued songs**"
            )
            .setFooter({
              text: `Page ${i + 1}/${pages} | Tracks: ${Discordplayer.tracks.size} | Time remaining: ${Discordplayer.durationFormatted}`,
            });
    
          embeds.push(embed);
        }
    
        if (embeds.length === 1) {
          return interaction.reply({
            embeds: [embeds[0]],
          });
        }
    
        await interaction.reply({
          embeds: [embeds[0]],
          components: [row],
        });
        const message = await interaction.fetchReply();
    
        const collector = message.createMessageComponentCollector({
          idle: 60000,
        });
    
        collector.on("collect", (i) => {
          i.deferUpdate();
    
          switch (i.customId) {
            case "prev":
              currentIndex =
                currentIndex === 0 ? embeds.length - 1 : currentIndex - 1;
              break;
            case "next":
              currentIndex =
                currentIndex === embeds.length - 1 ? 0 : currentIndex + 1;
              break;
            default:
              break;
          }
    
          interaction.editReply({
            embeds: [embeds[currentIndex]],
            components: [row],
          });
        });
    
        collector.on("end", () => {
          message.edit({
            components: [],
          });
        });
      } else if (Lavaplayer) {
        if (Lavaplayer.queue.length === 0) {
          return interaction.reply({
            content: `There aren't any other tracks in the queue. Use **/info** to show information about the current track.`,
            flags: MessageFlags.Ephemeral,
          });
        }
         const tracks2 = Lavaplayer.queue.map(
          (track, idx) => `\`${idx + 1}.\` [${track.title}](${track.uri}) - ${track.author} | ${track.requester}`
        );
    
         pages = Math.ceil(tracks2.length / chunkSize);
  
        for (let i = 0; i < pages; i++) {
          const start = i * chunkSize;
          const end = start + chunkSize;
    
          const embed = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Tracks Queue")
            .setDescription(
              tracks2.slice(start, end).join("\n") || "**No queued songs**"
            )
            .setFooter({
              text: `Page ${i + 1}/${pages} | Tracks: ${Lavaplayer.queue.size} | Time remaining: ${convertTime(Lavaplayer.queue.durationLength)}`,
            });
    
          embeds.push(embed);
        }
    
        if (embeds.length === 1) {
          return interaction.reply({
            embeds: [embeds[0]],
          });
        }
        await interaction.reply({
          embeds: [embeds[0]],
          components: [row],
        });
        const message2 = await interaction.fetchReply();
    
        const collector2 = message2.createMessageComponentCollector({
          idle: 60000,
        });
    
        collector2.on("collect", (i) => {
          i.deferUpdate();
    
          switch (i.customId) {
            case "prev":
              currentIndex =
                currentIndex === 0 ? embeds.length - 1 : currentIndex - 1;
              break;
            case "next":
              currentIndex =
                currentIndex === embeds.length - 1 ? 0 : currentIndex + 1;
              break;
            default:
              break;
          }
    
          interaction.editReply({
            embeds: [embeds[currentIndex]],
            components: [row],
          });
        });
    
        collector2.on("end", () => {
          message2.edit({
            components: [],
          });
        });
      } else {
        return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
      }
    break;
    case "lavalink":
      const player = client.manager.players.get(interaction.guild.id);
      if (!player) {
        return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
       }
       if (player.queue.length === 0) {
        return interaction.reply({
          content: `There aren't any other tracks in the queue. Use **/info** to show information about the current track.`,
          flags: MessageFlags.Ephemeral,
        });
      }
       const tracks2 = player.queue.map(
        (track, idx) => `\`${idx + 1}.\` [${track.title}](${track.uri}) - ${track.author} | ${track.requester}`
      );
  
       pages = Math.ceil(tracks2.length / chunkSize);

      for (let i = 0; i < pages; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
  
        const embed = new EmbedBuilder()
          .setColor("#e66229")
          .setTitle("Tracks Queue")
          .setDescription(
            tracks2.slice(start, end).join("\n") || "**No queued songs**"
          )
          .setFooter({
            text: `Page ${i + 1}/${pages} | Tracks: ${player.queue.size} | Time remaining: ${convertTime(player.queue.durationLength)}`,
          });
  
        embeds.push(embed);
      }
  
      if (embeds.length === 1) {
        return interaction.reply({
          embeds: [embeds[0]],
        });
      }
      await interaction.reply({
        embeds: [embeds[0]],
        components: [row],
      });
      const message2 = await interaction.fetchReply();
  
      const collector2 = message2.createMessageComponentCollector({
        idle: 60000,
      });
  
      collector2.on("collect", (i) => {
        i.deferUpdate();
  
        switch (i.customId) {
          case "prev":
            currentIndex =
              currentIndex === 0 ? embeds.length - 1 : currentIndex - 1;
            break;
          case "next":
            currentIndex =
              currentIndex === embeds.length - 1 ? 0 : currentIndex + 1;
            break;
          default:
            break;
        }
  
        interaction.editReply({
          embeds: [embeds[currentIndex]],
          components: [row],
        });
      });
  
      collector2.on("end", () => {
        message2.edit({
          components: [],
        });
      });
    break;
    case "discord_player":
      const queue = useQueue(interaction.guildId)
      if (!queue || !queue.isPlaying()) {
        interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
        return;
    }
    const formatTracks = queue.tracks.toArray();

    if (formatTracks.length === 0) {
      return interaction.reply({
        content: `There aren't any other tracks in the queue. Use **/info** to show information about the current track.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const tracks = formatTracks.map(
      (track, idx) => `**${idx + 1}.** [${track.title}](${track.url}) - ${track.author} | ${track.requestedBy}`
    );
    
    pages = Math.ceil(tracks.length / chunkSize);

    for (let i = 0; i < pages; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;

      const embed = new EmbedBuilder()
        .setColor("#e66229")
        .setTitle("Tracks Queue")
        .setDescription(
          tracks.slice(start, end).join("\n") || "**No queued songs**"
        )
        .setFooter({
          text: `Page ${i + 1}/${pages} | Tracks: ${queue.tracks.size} | Time remaining: ${queue.durationFormatted}`,
        });

      embeds.push(embed);
    }

    if (embeds.length === 1) {
      return interaction.reply({
        embeds: [embeds[0]],
      });
    }

    await interaction.reply({
      embeds: [embeds[0]],
      components: [row],
    });
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({
      idle: 60000,
    });

    collector.on("collect", (i) => {
      i.deferUpdate();

      switch (i.customId) {
        case "prev":
          currentIndex =
            currentIndex === 0 ? embeds.length - 1 : currentIndex - 1;
          break;
        case "next":
          currentIndex =
            currentIndex === embeds.length - 1 ? 0 : currentIndex + 1;
          break;
        default:
          break;
      }

      interaction.editReply({
        embeds: [embeds[currentIndex]],
        components: [row],
      });
    });

    collector.on("end", () => {
      message.edit({
        components: [],
      });
    });
    break;
  }

  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
