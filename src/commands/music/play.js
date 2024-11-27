const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder ,PermissionsBitField} = require("discord.js");
const { Player, QueryType, useMainPlayer } = require('discord-player');
const { convertTime } = require("../../utils/ConvertTime.js");
const User = require("../../models/UserPlayerSettings");
const GuildSettings = require("../../models/GuildSettings");
const Analytics = require("../../models/Analytics");  


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
      return interaction.reply({ content: "You can only run this command in a server.", ephemeral: true });
  }
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({content: 'You are not connected to a voice channel', ephemeral: true})
    if (!interaction.guild.members.me.permissionsIn(channel).has(PermissionsBitField.Flags.ViewChannel)) return interaction.reply({ content: "I dont have access to that channel", ephemeral: true})
    if (channel.full) return interaction.reply({content: 'That voice channel is full', ephemeral: true})
    await interaction.deferReply();

    const name = interaction.options.getString('query'); 
    const user = await User.findOne({ userId: interaction.user.id });
    const serverSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });

    let playerSettings = {
      volume: serverSettings?.defaultVolume || '30',
      searchEngine: user?.defaultSearchEngine || null,
      betaPlayer: user?.betaPlayer || false,
      playerMessages: serverSettings?.playerMessages || "default"
    }
    const hasPlayerSettings = !!user;
    let usedSearchEngine;
    let embed = new EmbedBuilder().setColor('#e66229');
    try { 
    switch (client.playerType) {
      case "both":{
        try {
          const player = useMainPlayer();
          const isLink = name.startsWith('https://') || name.startsWith('http://');
          let searchResult;
          
          if (!isLink) {
              // Try Spotify first
              searchResult = await player.search(name, {
                  requestedBy: interaction.user,
                  searchEngine: QueryType.SPOTIFY_SEARCH,
              });
          }
          // Fallback to YouTube if Spotify fails or if it's a link
          if (!searchResult || !searchResult.hasTracks()) {
              searchResult = await player.search(name, {
                  requestedBy: interaction.user,
                  searchEngine: QueryType.YOUTUBE, 
              });
          }
          // Final fallback to default if YouTube also fails (though unlikely)
          if (!searchResult || !searchResult.hasTracks()) {
              searchResult = await player.search(name, {
                  requestedBy: interaction.user,
              });
          }
          
          if (!searchResult || !searchResult.hasTracks()) return handleNoResults(interaction, name);
    
          usedSearchEngine = 'youtube'; 
    
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
    
            embed.setDescription(res.track.playlist
              ? `**Enqueued: [${res.playlist.title}](${res.playlist.url}) (${res.playlist.tracks.length} tracks)**`
              : `**Enqueued: [${res.tracks[0].title}](${res.tracks[0].url}) - ${res.tracks[0].author}** \`${res.tracks[0].duration}\``);
            client.totalTracksPlayed += res.track.playlist ? res.track.playlist.tracks.length : 1;
            await sendTrackEmbed(interaction, embed); 
          } catch (e) {
            return handlePlayError(interaction, name, e);
        }
        break;
      }

case "discord_player": {
    try {
      const player = useMainPlayer();
      const isLink = name.startsWith('https://') || name.startsWith('http://');
      let searchResult;
      
      if (!isLink) {
          // Try Spotify first
          searchResult = await player.search(name, {
              requestedBy: interaction.user,
              searchEngine: QueryType.SPOTIFY_SEARCH,
          });
      }
      // Fallback to YouTube if Spotify fails or if it's a link
      if (!searchResult || !searchResult.hasTracks()) {
          searchResult = await player.search(name, {
              requestedBy: interaction.user,
              searchEngine: QueryType.YOUTUBE, 
          });
      }
      // Final fallback to default if YouTube also fails (though unlikely)
      if (!searchResult || !searchResult.hasTracks()) {
          searchResult = await player.search(name, {
              requestedBy: interaction.user,
          });
      }
      
      if (!searchResult || !searchResult.hasTracks()) return handleNoResults(interaction, name);

      usedSearchEngine = 'youtube'; 

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

        embed.setDescription(res.track.playlist
          ? `**Enqueued: [${res.playlist.title}](${res.playlist.url}) (${res.playlist.tracks.length} tracks)**`
          : `**Enqueued: [${res.track.title}](${res.track.url}) - ${res.track.author}** \`${res.track.duration}\``);
        client.totalTracksPlayed += res.track.playlist ? res.track.playlist.tracks.length : 1;
        await sendTrackEmbed(interaction, embed); 
      } catch (e) {
        return handlePlayError(interaction, name, e);
    }
    break;
  }
        case "lavalink": {
          try {
          const player = await client.manager.createPlayer({
            guildId: interaction.guild.id,
            textId: interaction.channel.id,
            voiceId: channel.id,
            shardId: interaction.guild.shardId,
            volume: playerSettings.volume,
            deaf: true,
            loadBalancer: true,
            nodeName: client.manager.shoukaku.getIdealNode()?.name,
            data: {
              autoPlay: false,
              playerMessages: playerSettings.playerMessages
            }
        });

        const isLink = /^(https?:\/\/.+)/i.test(name); 
        let res;
        if (isLink) {
          res = await player.search(name, { requester: interaction.user });
        } else {
          let engine = playerSettings.searchEngine || 'deezer'; // Deezer is now the default
        
          if (engine === 'deezer') {
            res = await player.search(name, { requester: interaction.user, source: 'dzsearch:' });
        
            // Fallback to youtube_music if Deezer search fails
            if (!res.tracks.length) {
              engine = 'youtube_music';
              res = await player.search(name, { requester: interaction.user, engine: engine });
            }
          } else { // Use the specified engine (not Deezer)
            res = await player.search(name, { requester: interaction.user, engine: engine });
          }
        }

        usedSearchEngine = res?.tracks[0]?.sourceName;
        if (!res.tracks.length) return handleNoResults(interaction, name); 

        if (res.type === "PLAYLIST") {
            for (let track of res.tracks) player.queue.add(track);
            if (!player.playing && !player.paused) player.play();
            embed.setColor('#e66229').setDescription(`**Enqueued: [${res.playlistName}](${name}) (${res.tracks.length} tracks**)`);
        } else {
            player.queue.add(res.tracks[0]);
            if (!player.playing && !player.paused) player.play();
            embed.setColor('#e66229').setDescription(`**Enqueued: [${res.tracks[0].title}](${res.tracks[0].uri}) - ${res.tracks[0].author}** \`${convertTime(res.tracks[0].length, true)}\``);
        }

        client.totalTracksPlayed += res.type === "PLAYLIST" ? res.tracks.length : 1;
        await sendTrackEmbed(interaction, embed); 
      }
        catch (e) {
          return handlePlayError(interaction, name, e);
        }
        break;
      }
      default:
        break;
    }


    //Analytics
    try {
      let analytics = await Analytics.findOne();
      if (!analytics) {
          analytics = new Analytics({ usedSearchEngines: new Map() }); 
      } else if (!(analytics.usedSearchEngines instanceof Map)) { 
          analytics.usedSearchEngines = new Map();
      }
      analytics.totalPlayCount++;
      if (hasPlayerSettings) {
          analytics.playHasPlayerSettingsCount++;
      }
  
      if (usedSearchEngine) {
        analytics.usedSearchEngines.set(usedSearchEngine, (analytics.usedSearchEngines.get(usedSearchEngine) || 0) + 1);
    }
  const guildIndex = analytics.guildPlayCount.findIndex(guild => guild.guildId === interaction.guild.id);
    if (guildIndex === -1) {
      analytics.guildPlayCount.push({guildId: interaction.guild.id, playCount: 1})
    } else {
      analytics.guildPlayCount[guildIndex].playCount++;
    }
    await analytics.save();
      
    } catch (error) {
      console.log("error doing Analytics",error)
    }

  } catch (e) { 
    return handlePlayError(interaction, name, e);
  }




  async function sendTrackEmbed(interaction, embed) {
    const hasViewChannelPermission = interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.ViewChannel);
    const hasSendMessagesPermission = interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.SendMessages);

    if (!hasViewChannelPermission || !hasSendMessagesPermission) {
        embed.setFooter({ text: `Media Controls Disabled: Missing Permissions` });
    } else if (Math.random() < 0.08) { //  8% chance of showing a tip
        embed.setFooter({ text: Math.random() < 0.04 ? `Change the default volume with /player-settings!` : `Want to use another search engine? Change it with /player-settings!` });
    }

    return interaction.editReply({ content: " ", embeds: [embed] });
}

async function handlePlayError(interaction, name, error) {
  console.error(`Error Running Play:[${interaction.guild.name}] (ID: ${interaction.guild.id}) Request: (${name}) Error:`, error);

  try {
      let analytics = await Analytics.findOne();
      if (!analytics) {
          analytics = new Analytics();
      }
      analytics.failedPlayCount++;
      await analytics.save();
  } catch (analyticsError) {
      console.error("Error updating analytics (handlePlayError):", analyticsError);
  }
  return interaction.editReply(`Oops seems something went wrong: ${error}, Please join the [support server](https://discord.com/invite/rDHPK2er3j) if this keeps happening`).catch(() => { });
}

async function handleNoResults(interaction, query) {
  try {
      let analytics = await Analytics.findOne();
      if (!analytics) {
          analytics = new Analytics();
      }
      analytics.failedSearchCount++; 
      await analytics.save();
  } catch (analyticsError) {
      console.error("Error updating analytics (handleNoResults):", analyticsError);
  }

  return interaction.followUp(`No results found for: ${query}`);
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
