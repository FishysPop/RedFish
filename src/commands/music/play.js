const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder ,PermissionsBitField, MessageFlags} = require("discord.js");
const { convertTime } = require("../../utils/ConvertTime.js");
const User = require("../../models/UserPlayerSettings");
const GuildSettings = require("../../models/GuildSettings");
const { updatePlayAnalytics } = require("../../utils/cacheManager");
const handleExcessiveLavaErrors = require("../../utils/handleExcessiveLavaErrors");
const { handleSpotifyNativePlay } = require("../../utils/spotifyNativePlay.js");
const { thirdPartySourceHandler } = require("../../utils/thirdPartySourceHandler.js");
const { searchTidalTracks } = require("../../utils/tidalNativePlay.js");
const youtubeSr = require("youtube-sr").default;
const { sanitizeSearchQuery } = require("../../utils/searchSanitization.js");

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
      return interaction.reply({ content: "You can only run this command in a server.", flags: MessageFlags.Ephemeral });
    }
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({content: 'You are not connected to a voice channel', flags: MessageFlags.Ephemeral})
    if (!interaction.guild.members.me.permissionsIn(channel).has(PermissionsBitField.Flags.ViewChannel)) return interaction.reply({ content: "I dont have access to that channel", flags: MessageFlags.Ephemeral})
    if (channel.full) return interaction.reply({content: 'That voice channel is full', flags: MessageFlags.Ephemeral});
    await interaction.deferReply();

    const name = sanitizeSearchQuery(interaction.options.getString('query'));
    const user = await User.findOne({ userId: interaction.user.id });
    const serverSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });

    let playerSettings = {
      volume: serverSettings?.defaultVolume || '30',
      searchEngine: user?.defaultSearchEngine || null,
      SpotifyNativePlay: user?.SpotifyNativePlay || false,
      TidalNativePlay: user?.TidalNativePlay || false,
      playerMessages: serverSettings?.playerMessages || "default",
      convertLinks: user?.convertLinks || false,
      PreferedNode: serverSettings?.preferredNode || null
    }
    const hasPlayerSettings = !!user;
    let player = null;
    let usedSearchEngine;
    let embed = new EmbedBuilder().setColor('#e66229');

    try { 
      player = client.manager.getPlayer(interaction.guild.id);
      if (!player) {
        player = await client.manager.createPlayer({
          guildId: interaction.guild.id,
          textChannelId: interaction.channel.id,
          voiceChannelId: channel.id,
          volume: parseInt(playerSettings.volume, 10) || 30,
          selfDeaf: true,
          nodeOptions: playerSettings.PreferedNode ? { id: playerSettings.PreferedNode } : undefined,
          customData: {
            autoPlay: false,
            playerMessages: playerSettings.playerMessages
          }
        });
      } else if (player.textChannelId !== interaction.channel.id) {
        player.textChannelId = interaction.channel.id;
      }
      if (!player.connected) await player.connect();

      let res;

      const isThirdPartyLink = thirdPartySourceHandler.getSupportedSources().some(source => {
          const sourceConfig = thirdPartySourceHandler.getSource(source);
          return sourceConfig.isUrlSupported(name);
      });

      if (isThirdPartyLink) {
          const result = await thirdPartySourceHandler.handleSource(name, player, interaction.user, client, null, false, playerSettings);
          if (result) {
              let sourceUsed = 'unknown';
              if (name.includes('spotify.com')) {
                  sourceUsed = 'spotify_native';
              } else if (name.includes('tidal.com')) {
                  sourceUsed = 'tidal_native';
              }
              usedSearchEngine = sourceUsed;
              
              if (result.type === 'PLAYLIST') {
                  embed.setColor('#e66229').setDescription(`**Enqueued: [${result.playlistName}](${name}) (${result.tracks.length} tracks)**`);
                  await sendTrackEmbed(interaction, embed);
                  updatePlayAnalytics({ guildId: interaction.guild.id, hasPlayerSettings, usedSearchEngine });
                  return;
              } else {
                  res = result;
              }
          }
      }

      if (!res) {
        const isLink = /^(https?:\/\/.+)/i.test(name); 
        if (isLink && playerSettings.convertLinks) {
          try {
            const videoIdMatch = name.match(/(?:https?:\/\/)?(?:www\.|music\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            const videoId = videoIdMatch ? videoIdMatch[1] : name;

            let ytivideo;
            try {
              ytivideo = await client.ytiClient.getVideo(videoId);
            } catch (e) {
              console.error("Error fetching video from ytiClient:", e);
            }
            let query = ytivideo?.music?.title && ytivideo?.music?.artist 
                ? `${ytivideo.music.artist} - ${ytivideo.music.title}` 
                : ytivideo?.title;

            if (!query) {
                const searchResults = await youtubeSr.searchOne(videoId);
                query = searchResults?.title;
            }

            if (query) {
              if (playerSettings.TidalNativePlay) {
                  const tidalSearchResult = await searchTidalTracks(query, interaction.user);                    
                  if (tidalSearchResult?.tracks?.length > 0) {
                      const track = tidalSearchResult.tracks[0];
                      try {
                          const nativeResult = await thirdPartySourceHandler.handleSource(track.uri, player, interaction.user, client, track, false, playerSettings);
                          if (nativeResult?.tracks?.length > 0) {
                              res = nativeResult;
                              usedSearchEngine = 'tidal_native';
                          } else {
                              res = await player.search({ query: query, source: "ytmsearch" }, interaction.user);
                              usedSearchEngine = 'youtube_music';
                          }
                      } catch (tidalError) {
                          console.error("[Play Command] Error in Tidal native playback:", tidalError);
                          res = await player.search({ query: query, source: "ytmsearch" }, interaction.user);
                          usedSearchEngine = 'youtube_music';
                      }
                  }
              }

              if (!res || !res.tracks.length) {
                  res = await player.search({ query: query, source: "ytmsearch" }, interaction.user);
              }
            }

            if (!res || !res.tracks.length) {
              res = await player.search(name, { requester: interaction.user });
            }
          } catch (YoutubeConvertError) {
            console.error("youtube converting links error:", YoutubeConvertError);
            res = await player.search(name, { requester: interaction.user });
          }
        } else if (isLink) {
            res = await player.search(name, { requester: interaction.user });
        } else {
          if (playerSettings.searchEngine === 'tidal' && playerSettings.TidalNativePlay) {
              const tidalSearchResult = await searchTidalTracks(name, interaction.user);
              
              if (tidalSearchResult?.tracks?.length > 0) {
                  const track = tidalSearchResult.tracks[0];
                  try {
                      const nativeResult = await thirdPartySourceHandler.handleSource(track.uri, player, interaction.user, client, track, false, playerSettings);
                      if (nativeResult && nativeResult.tracks?.length > 0 && Array.isArray(nativeResult.tracks)) {
                          res = nativeResult;
                          usedSearchEngine = 'tidal_native';
                      } else {
                          res = await player.search(name, { requester: interaction.user });
                          usedSearchEngine = 'youtube_music';
                      }
                  } catch (tidalError) {
                      console.error("[Play Command] Error in Tidal native playback:", tidalError);
                      res = await player.search(name, { requester: interaction.user });
                      usedSearchEngine = 'youtube_music';
                      console.log("[Play Command] Tidal native playback failed with error, falling back to lavalink search.");
                  }
              } else {
                  const fallbackSearchStrategy = ['spotify', 'youtube_music'];
                  for (const engine of fallbackSearchStrategy) {
                      usedSearchEngine = engine;
                      const searchOptions = { requester: interaction.user };
                      searchOptions[engine === 'deezer' ? 'source' : 'engine'] = engine === 'deezer' ? 'dzsearch:' : engine;
                      res = await player.search(name, searchOptions);
                      if (res?.tracks.length) {
                          const track = res.tracks[0];
                          const isSpotifyResult = track.sourceName === 'spotify';
                          if (isSpotifyResult && playerSettings.SpotifyNativePlay) {
                              const nativeResult = await thirdPartySourceHandler.handleSource(track.realUri, player, interaction.user, client, null, false, playerSettings);
                              if (nativeResult) {
                                  res = nativeResult;
                                  usedSearchEngine = 'spotify_native';
                              }
                          }
                          break;
                      }
                  }
              }
          } else {
              const searchStrategy = [playerSettings.searchEngine || 'youtube_music', 'spotify']; 

              for (const engine of searchStrategy) {
                  usedSearchEngine = engine;
                  const searchOptions = { requester: interaction.user };
                  searchOptions[engine === 'deezer' ? 'source' : 'engine'] = engine === 'deezer' ? 'dzsearch:' : engine;
                  res = await player.search(name, searchOptions);
                  if (res?.tracks.length) {
                      const track = res.tracks[0];
                      const isSpotifyResult = track.sourceName === 'spotify';
                      if (isSpotifyResult && playerSettings.SpotifyNativePlay) {
                          const nativeResult = await thirdPartySourceHandler.handleSource(track.realUri, player, interaction.user, client, null, false, playerSettings);
                          if (nativeResult) {
                              res = nativeResult;
                              usedSearchEngine = 'spotify_native';
                          }
                      }
                      break;
                  }
              }
          }
        }
      }

      if (!usedSearchEngine) usedSearchEngine = res?.tracks[0]?.sourceName;
      if (!res || !res.tracks.length) return handleNoResults(interaction, name);

      const isPlaylist = res.isPlaylist || res.loadType === "PLAYLIST_LOADED" || res.loadType === "playlist" || !!res.playlist;
      const playlistName = res.playlistName || res.playlist?.name || res.playlist?.title || res.data?.name || "Playlist";

      if (isPlaylist) {
          for (let track of res.tracks) player.queue.add(track);
          if (!player.playing && !player.paused) {
              try {
                  await player.play();
              } catch (playError) {
                  console.error("[Play Command] Error during player.play():", playError);
                  return handlePlayError(interaction, name, playError, player);
              }
          }
          embed.setColor('#e66229').setDescription(`**Enqueued: [${playlistName}](${name}) (${res.tracks.length} tracks)**`);
      } else {
          player.queue.add(res.tracks[0]);
          if (!player.playing && !player.paused) {
              try {
                  await player.play();
              } catch (playError) {
                  console.error("[Play Command] Error during player.play():", playError);
                  return handlePlayError(interaction, name, playError, player);
              }
          }
          const addedTrack = res.tracks[0];
          const trackTitle = addedTrack.info?.title || addedTrack.title;
          const trackUri = addedTrack.info?.uri || addedTrack.uri;
          const trackAuthor = addedTrack.info?.author || addedTrack.author;
          const trackDuration = addedTrack.info?.duration || addedTrack.length || 0;
          embed.setColor('#e66229').setDescription(`**Enqueued: [${trackTitle}](${trackUri}) - ${trackAuthor}** \`${convertTime(trackDuration, true)}\``);
      }

      client.totalTracksPlayed += isPlaylist ? res.tracks.length : 1;
      await sendTrackEmbed(interaction, embed); 

      updatePlayAnalytics({ guildId: interaction.guild.id, hasPlayerSettings, usedSearchEngine });
    } catch (e) {
      return handlePlayError(interaction, name, e, player);
    }

    async function sendTrackEmbed(interaction, embed) {
      const hasViewChannelPermission = interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.ViewChannel);
      const hasSendMessagesPermission = interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.SendMessages);

      if (!hasViewChannelPermission || !hasSendMessagesPermission) {
          embed.setFooter({ text: `Media Controls Disabled: Missing Permissions` });
      } else if (Math.random() < 0.08) { 
          const tips = [
              `Change the default volume with /player-settings!`,
              `Want to use another search engine? Change it with /player-settings!`,
              `Enable direct Spotify/Tidal streaming with /player-settings! (beta)`
          ];
          const randomTip = tips[Math.floor(Math.random() * tips.length)];
          embed.setFooter({ text: randomTip });
      }

      return interaction.editReply({ content: " ", embeds: [embed] });
    }

    async function handlePlayError(interaction, name, error, player) {
      console.error(`Error Running Play:[${interaction.guild.name}] (ID: ${interaction.guild.id}) Request: (${name || 'N/A'}) Node: (${player?.node?.name || player?.shoukaku?.node?.name || 'N/A'}) Error:`, error);
      updatePlayAnalytics({ errorType: 'playError' });
      if (player && client.manager && typeof handleExcessiveLavaErrors === 'function') {
        handleExcessiveLavaErrors(player, client.manager);
      }
      return interaction.editReply(`Oops seems something went wrong: ${error}, Please join the support server if this keeps happening`).catch(() => {});
    }

    async function handleNoResults(interaction, query) {
      updatePlayAnalytics({ errorType: 'noResults' });
      const isYoutubeLink = /(?:https?:\/\/)?(?:www\.|music\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(query);
      const embed = new EmbedBuilder()
        .setColor('#e66229')
        .setTitle(`No results found for: ${query}`)
        .setDescription(isYoutubeLink ? `Our servers might be blocked by YouTube. Try enabling **Converting Links** and **Tidal Native Play** in \`/player-settings\` to play it.` : `Try rephrasing your search or use a different query.`);
      return interaction.followUp({ embeds: [embed] });
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

    const node = client.manager.nodeManager.getNode();
    const resultsSoundcloudLavalink = node ? await node.search({ query, source: 'scsearch' }, interaction.user).catch(() => null) : null;
    const resultsSpotifyLavalink = node ? await node.search({ query, source: 'spsearch' }, interaction.user).catch(() => null) : null;

    const tracksSoundcloudLavalink = resultsSoundcloudLavalink?.tracks?.length ? resultsSoundcloudLavalink.tracks.slice(0, 5).map((t) => {
      const title = t.info?.title || t.title;
      const author = t.info?.author || t.author;
      const duration = t.info?.duration || t.length || 0;
      const uri = t.info?.uri || t.uri;
      const labelText = `SoundCloud: ${title} - ${author} (${convertTime(duration, true)})`;
      return {
        name: labelText.length > 95 ? labelText.substring(0, 92) + '...' : labelText,
        value: uri.length > 92 ? `${title} ${author}`.substring(0, 95) : uri,
      };
    }) : [{ name: "No SoundCloud Results Found", value: query.substring(0, 95) }];  

    const tracksSpotifyLavalink = resultsSpotifyLavalink?.tracks?.length ? resultsSpotifyLavalink.tracks.slice(0, 5).map((t) => {
      const title = t.info?.title || t.title;
      const author = t.info?.author || t.author;
      const duration = t.info?.duration || t.length || 0;
      const uri = t.info?.uri || t.uri;
      const labelText = `Spotify: ${title} - ${author} (${convertTime(duration, true)})`;
      return {
        name: labelText.length > 95 ? labelText.substring(0, 92) + '...' : labelText,
        value: uri.length > 92 ? `${title} ${author}`.substring(0, 95) : uri,
      };
    }) : [{ name: "No Spotify Results Found", value: query.substring(0, 95) }];
    
    const tracksLavalink = [];
    tracksSoundcloudLavalink.forEach((t) => tracksLavalink.push({ name: t.name, value: t.value }));
    tracksSpotifyLavalink.forEach((t) => tracksLavalink.push({ name: t.name, value: t.value }));
    return interaction.respond(tracksLavalink);
  },
};