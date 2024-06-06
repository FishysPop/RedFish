const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder ,PermissionsBitField} = require("discord.js");
const { Player, QueryType, useMainPlayer } = require('discord-player');
const { convertTime } = require("../../utils/ConvertTime.js");

module.exports =  {
    data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play music/playlist in a vc")
    .addStringOption(option => option
        .setName("query")
        .setDescription("name of the song")
        .setRequired(true).setAutocomplete(true)),


  run: async({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });
     return;
    }
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({content: 'You are not connected to a voice channel',ephemeral: true})
    if (!interaction.guild.members.me.permissionsIn(channel).has(PermissionsBitField.Flags.ViewChannel)) return interaction.reply({content: "I dont have access to that channel",ephemeral: true})
    if (channel.full) return interaction.reply({content: 'That voice channel is full',ephemeral: true})
    await interaction.deferReply();
    const name = interaction.options.getString('query'); 

    switch (client.playerType) {
      case "both":
        try {
          const player = useMainPlayer();
          const searchResult = await player.search(name, {
              requestedBy: interaction.user,
            });
            if (!searchResult.hasTracks()) {
              return interaction.followUp(`We found no tracks for ${name}`);
            }
              const res = await player.play(
                  interaction.member.voice.channel.id,
                  searchResult,
                  {
                    nodeOptions: {
                      metadata: {
                        channel: interaction.channel,
                        client: interaction.guild.members.me,
                        requestedBy: interaction.user,
                      },
                      volume: 30,
                      bufferingTimeout: 500,
                      leaveOnEmpty: true,
                      leaveOnEnd: false,
                      leaveOnEmptyCooldown: 300000,
                      skipOnNoStream: true,
                      connectionTimeout: 999_999_999
                    },
                  }
                );
                if (!interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.ViewChannel)) {
                  if (res.track.playlist) {
                    const embed = new EmbedBuilder()
                    .setColor('#e66229')
                    .setDescription(`**Enqueued: [${res.track.playlist.title}](${res.track.playlist.url}) (${res.track.playlist.tracks.length} tracks)**`)
                    .setFooter({ text: `Media Controls Disabled: Missing Permissions`})
                     return interaction.editReply({ embeds: [embed] });
                  } else {
                    const embed = new EmbedBuilder()
                    .setColor('#e66229')
                    .setDescription(`**Enqueued: [${res.track.title}](${res.track.url}) - ${res.track.author}** \`${res.track.duration}\``)
                    .setFooter({ text: `Media Controls Disabled: Missing Permissions`})
                     return interaction.editReply({ embeds: [embed] });
                  }
                } else {
                  if (res.track.playlist) {
                    const embed = new EmbedBuilder()
                    .setColor('#e66229')
                    .setDescription(`**Enqueued: [${res.track.playlist.title}](${res.track.playlist.url}) (${res.track.playlist.tracks.length} tracks)**`)
                     return interaction.editReply({ embeds: [embed] });
                  } else {
                    const embed = new EmbedBuilder()
                    .setColor('#e66229')
                    .setDescription(`**Enqueued: [${res.track.title}](${res.track.url}) - ${res.track.author}** \`${res.track.duration}\``)
                     return interaction.editReply({ embeds: [embed] });
                  }
                }
              } 
                catch (e) {
                   console.log(e)
              return interaction.editReply(`Something went wrong: ${e}`);
          }
        break;

case "discord_player":
    try {
      const isLink = name.startsWith('https://') || name.startsWith('http://');
        const player = useMainPlayer();
        let searchResult;
        if (!isLink) {

        // Only search with spotify if no link
        searchResult = await player.search(name, {
            requestedBy: interaction.user,
            searchEngine: QueryType.SPOTIFY_SEARCH, 
        });
      }

        // If no tracks are found on Spotify, fallback to youtube
        if (!searchResult || searchResult.tracks.length === 0) {
            searchResult = await player.search(name, {
                requestedBy: interaction.user,
                searchEngine: QueryType.YOUTUBE 
            });        
      }
      
        if (!searchResult || searchResult.tracks.length === 0) {
          searchResult = await player.search(name, {
              requestedBy: interaction.user,
          });
          console.log("default tracks:",searchResult.tracks[0])
      }

        if (!searchResult || searchResult.tracks.length === 0) {
            return interaction.followUp(`We found no tracks for ${name}`);
        }

        const res = await player.play(
            interaction.member.voice.channel.id,
            searchResult,
            {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild.members.me,
                        requestedBy: interaction.user,
                    },
                    volume: 1,
                    bufferingTimeout: 500,
                    leaveOnEmpty: true,
                    leaveOnEnd: false,
                    leaveOnEmptyCooldown: 300000,
                    skipOnNoStream: true,
                    connectionTimeout: 999_999_999,
                },
            }
        );

        const hasViewChannelPermission = interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.ViewChannel);
        const hasSendMessagesPermission = interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.SendMessages);

        const embed = new EmbedBuilder().setColor('#e66229');
        if (res.track.playlist) {
            embed.setDescription(`**Enqueued: [${res.track.playlist.title}](${res.track.playlist.url}) (${res.track.playlist.tracks.length} tracks)**`);
        } else {
            embed.setDescription(`**Enqueued: [${res.track.title}](${res.track.url}) - ${res.track.author}** \`${res.track.duration}\``);
        }

        if (!hasViewChannelPermission || !hasSendMessagesPermission) {
            embed.setFooter({ text: `Media Controls Disabled: Missing Permissions` });
        }

        return interaction.editReply({ embeds: [embed] });
    } catch (e) {
        console.log(`[${interaction.guild.name}] (ID:${interaction.channel.id}) request:(${name}) Error emitted from play: ${e}`);
        return interaction.editReply(`Oops... something went wrong`).catch(() => { });
    }
    break;


        case "lavalink":
          try {
          const player = await client.manager.createPlayer({
            guildId: interaction.guild.id,
            textId: interaction.channel.id,
            voiceId: channel.id,
            volume: 30,
            deaf: true
        });

        const res = await player.search(name, { requester: interaction.user });
        if (!res.tracks.length) return interaction.editReply("No results found!");

        if (res.type === "PLAYLIST") {
            for (let track of res.tracks) player.queue.add(track);

            if (!player.playing && !player.paused) player.play();

            const embed = new EmbedBuilder()
                .setColor('#e66229')
                .setDescription(`**Enqueued: [${res.playlistName}](${name}) (${res.tracks.length} tracks**)`)
            return interaction.editReply({ content: " ", embeds: [embed] })
        } else {
            player.queue.add(res.tracks[0]);

            if (!player.playing && !player.paused) player.play();
            const embed = new EmbedBuilder()
                .setColor('#e66229')
                .setDescription(`**Enqueued: [${res.tracks[0].title}](${res.tracks[0].uri}) - ${res.tracks[0].author}** \`${convertTime(res.tracks[0].length, true)}\``)
            return interaction.editReply({ content: " ", embeds: [embed] })
        }
      }
        catch (e) {
          console.log(e)
      return interaction.editReply(`Something went wrong: ${e}`);
        }
        break;
    
      default:
        break;
    }



  

  },
  async autocompleteRun(interaction) {
    const player = useMainPlayer();
    const query = interaction.options.getString("query", true);
    const resultsYouTube = await player.search(query, { searchEngine: QueryType.YOUTUBE });
    const resultsSpotify = await player.search(query, { searchEngine: QueryType.SPOTIFY_SEARCH });

    const tracksYouTube = resultsYouTube.tracks.slice(0, 5).map((t) => ({
        name: `YouTube: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
        value: t.url,
    }));

    const tracksSpotify = resultsSpotify.tracks.slice(0, 5).map((t) => ({
        name: `Spotify: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
        value: t.url,
    }));

    const tracks = [];

    tracksYouTube.forEach((t) => tracks.push({ name: t.name, value: t.value }));
    tracksSpotify.forEach((t) => tracks.push({ name: t.name, value: t.value }));

    return interaction.respond(tracks);
},

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
