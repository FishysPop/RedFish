const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder ,PermissionsBitField} = require("discord.js");
const { Player, QueryType, useMainPlayer } = require('discord-player');
const { convertTime } = require("../../utils/ConvertTime.js");
const User = require("../../models/UserPlayerSettings");
const GuildSettings = require("../../models/GuildSettings");

module.exports =  {
    data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play music/playlist in a vc")
    .addStringOption(option => option
        .setName("query")
        .setDescription("Name/link of the song.")
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
    const user = await User.findOne({ userId: interaction.user.id });
    const serverSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    const hasViewChannelPermission = interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.ViewChannel);
    const hasSendMessagesPermission = interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.SendMessages);

    let playerSettings = {
      volume: serverSettings?.defaultVolume || '30',
      searchEngine: user?.defaultSearchEngine || null,
      betaPlayer: user?.betaPlayer || false,
      playerMessages: serverSettings?.playerMessages || "default"
    }
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
                        playerMessages: playerSettings.playerMessages
                    },
                    volume: playerSettings.volume,
                    bufferingTimeout: 500,
                    leaveOnEmpty: true,
                    leaveOnEnd: false,
                    leaveOnEmptyCooldown: 300000,
                    skipOnNoStream: true,
                    connectionTimeout: 999_999_999,
                },
            }
        );


        const embed = new EmbedBuilder().setColor('#e66229');
        if (res.track.playlist) {
            embed.setDescription(`**Enqueued: [${res.track.playlist.title}](${res.track.playlist.url}) (${res.track.playlist.tracks.length} tracks)**`);
            client.totalTracksPlayed += res.track.playlist.tracks.length;
        } else {
            embed.setDescription(`**Enqueued: [${res.track.title}](${res.track.url}) - ${res.track.author}** \`${res.track.duration}\``);
            client.totalTracksPlayed += 1;
        }

        if (!hasViewChannelPermission || !hasSendMessagesPermission) {
            embed.setFooter({ text: `Media Controls Disabled: Missing Permissions` });
        } else {
          const randomNumber = Math.random()
          if (randomNumber < 0.08) {
            if (randomNumber < 0.04) {
              embed.setFooter({ text: `Change the default volume with /player-settings!` });
            } else {
              embed.setFooter({ text: `Want to use another search engine? /player-settings!` });
            }
          }
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
            shardId: interaction.guild.shardId,
            volume: playerSettings.volume,
            deaf: true,
            loadBalancer: true,
            data: {
              autoPlay: false,
              playerMessages: playerSettings.playerMessages
            }
        });

        const res = await player.search(name, { requester: interaction.user, engine: playerSettings.searchEngine ? playerSettings.searchEngine : 'youtube_music' });
        if (!res.tracks.length) return interaction.editReply("No results found!")
        let embed = new EmbedBuilder()

        if (res.type === "PLAYLIST") {
            for (let track of res.tracks) player.queue.add(track);

            if (!player.playing && !player.paused) player.play();
            client.totalTracksPlayed += res.tracks.length;

            embed.setColor('#e66229').setDescription(`**Enqueued: [${res.playlistName}](${name}) (${res.tracks.length} tracks**)`);
        } else {
            player.queue.add(res.tracks[0]);

            if (!player.playing && !player.paused) player.play();
            client.totalTracksPlayed += 1;
            embed.setColor('#e66229').setDescription(`**Enqueued: [${res.tracks[0].title}](${res.tracks[0].uri}) - ${res.tracks[0].author}** \`${convertTime(res.tracks[0].length, true)}\``);
        }
        if (!hasViewChannelPermission || !hasSendMessagesPermission) {
          embed.setFooter({ text: `Media Controls Disabled: Missing Permissions` });
      } else {
        const randomNumber = Math.random()
        if (randomNumber < 0.08) {
          if (randomNumber < 0.04) {
            embed.setFooter({ text: `Change the default volume with /player-settings!` });
          } else {
            embed.setFooter({ text: `Want to use another search engine? Change it with /player-settings!` });
          }
        }
      }
      return interaction.editReply({ content: " ", embeds: [embed] })

      }
        catch (e) {
          console.log("Error running play: ",e)
      return interaction.editReply(`Oops seems something went wrong: ${e}, Please join the [support server](https://discord.com/invite/rDHPK2er3j) if this keeps happening`);
        }
        break;
    
      default:
        break;
    }



  

  },
  async autocompleteRun(interaction, client) {
    const query = interaction.options.getString("query", true);
    if (!query) return;
    const lastInteraction = interaction.client.userInteractions.get(interaction.user.id);
    if (lastInteraction && Date.now() - lastInteraction < 1000) {
      return interaction.respond([]); 
    }
    interaction.client.userInteractions.set(interaction.user.id, Date.now());
    switch (client.playerType) {
      case "both":
       if (client.playerType === "both") {
        const resultsYouTubeLavalink = await client.manager.search(query, { searchEngine: 'youtube_music'});
        const resultsSpotifyLavalink = await client.manager.search(query, { searchEngine: 'spotify'});
        const tracksYouTubeLavalink = resultsYouTubeLavalink.tracks.slice(0, 5).map((t) => ({
          name: `YouTube: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${convertTime(t.length, true)})` : `${t.title} - ${t.author} (${convertTime(t.length, true)})`}`,
          value: t.uri,
      }));
  
      const tracksSpotifyLavalink = resultsSpotifyLavalink.tracks.slice(0, 5).map((t) => ({
          name: `Spotify: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${convertTime(t.length, true)})` : `${t.title} - ${t.author} (${convertTime(t.length, true)})`}`,
          value: t.uri,
      }));
      const tracksLavalink = [];
    
      tracksYouTubeLavalink.forEach((t) => tracksLavalink.push({ name: t.name, value: t.value }));
      tracksSpotifyLavalink.forEach((t) => tracksLavalink.push({ name: t.name, value: t.value }));
      return interaction.respond(tracksLavalink);
       }
      break;
      case "lavalink":
        const resultsSoundcloudLavalink = await client.manager.search(query, { engine: 'soundcloud'}).catch(e = null) || null;
        const resultsSpotifyLavalink = await client.manager.search(query, { engine: 'spotify'}).catch(e => null) || null;
        const tracksSoundcloudLavalink = resultsSoundcloudLavalink.tracks[0] ? resultsSoundcloudLavalink.tracks.slice(0, 5).map((t) => ({
          name: `SoundCloud: ${`${t.title} - ${t.author} (${convertTime(t.length, true)})`.length > 70 ? `${`${t.title} - ${t.author}`.substring(0, 70)}... (${convertTime(t.length, true)})` : `${t.title} - ${t.author} (${convertTime(t.length, true)})`}`,
          value: t.uri.length > 92 ? `${t.title} ${t.author}`.substring(0, 95) : t.uri,
      })) : [{ name: "No SoundCloud Results Found", value: query}];  
  
      const tracksSpotifyLavalink = resultsSpotifyLavalink ? resultsSpotifyLavalink.tracks.slice(0, 5).map((t) => ({
          name: `Spotify: ${`${t.title} - ${t.author} (${convertTime(t.length, true)})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${convertTime(t.length, true)})` : `${t.title} - ${t.author} (${convertTime(t.length, true)})`}`,
          value: t.uri.length > 92 ? `${t.title} ${t.author}`.substring(0, 95) : t.uri,
      })) : [{ name: "No Spotify Results Found", value: query}];
      const tracksLavalink = [];
    
      tracksSoundcloudLavalink.forEach((t) => tracksLavalink.push({ name: t.name, value: t.value }));
      tracksSpotifyLavalink.forEach((t) => tracksLavalink.push({ name: t.name, value: t.value }));
      return interaction.respond(tracksLavalink);

      break;
      case "discord_player":
        const player = useMainPlayer();
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
      break;
    }
},

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
