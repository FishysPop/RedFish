const { EmbedBuilder, Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField} = require('discord.js')
const { convertTime } = require("../../utils/ConvertTime.js");
const MetadataFilter = require('@web-scrobbler/metadata-filter');
const handleExcessiveLavalinkErrors = require("../../utils/handleExcessiveLavaErrors.js")
const { checkQueueForNativePlay } = require("../../utils/spotifyNativePlay.js");
const { checkQueueForTidalNativePlay } = require("../../utils/tidalNativePlay.js");
require("dotenv").config();


const PlayerSession = require("../../models/PlayerSession");

module.exports = (client) => {
client.manager.nodeManager.on('connect', async (node) => {
  console.log(`Lavalink Node ${node.id}: Connected & Ready!`);
  node.updateSession(true, 300_000);

  try {
    const savedSessions = await PlayerSession.find({});

    for (const savedData of savedSessions) {
      if (client.manager.getPlayer(savedData.guildId)) continue;

      const player = client.manager.createPlayer({
        guildId: savedData.guildId,
        voiceChannelId: savedData.voiceChannelId,
        textChannelId: savedData.textChannelId,
        node: node.id,
        volume: typeof savedData.volume === "number" ? savedData.volume : 30,
        selfDeaf: savedData.selfDeaf ?? true,
        customData: savedData.customData || {},
      });

      await player.connect();

      if (savedData.currentTrack) {
        try {
          const builtCurrentTrack = client.manager.utils.buildTrack(savedData.currentTrack, savedData.currentTrack.requester || savedData.requester);
          if (builtCurrentTrack) {
            player.queue.current = builtCurrentTrack;
          }
        } catch (tErr) {
          console.error("Error restoring current track from DB:", tErr);
        }
      }

      if (savedData.queueTracks && Array.isArray(savedData.queueTracks) && savedData.queueTracks.length > 0) {
        for (const rawTrack of savedData.queueTracks) {
          try {
            const builtTrack = client.manager.utils.buildTrack(rawTrack, rawTrack.requester || savedData.requester);
            if (builtTrack) player.queue.add(builtTrack);
          } catch (tErr) {
            console.error("Error restoring queued track:", tErr);
          }
        }
      }

      if (player.queue.current) {
        const startPos = savedData.position && savedData.position > 1000 ? savedData.position : 0;
        await player.play({ track: player.queue.current, position: startPos, paused: Boolean(savedData.paused) }).catch(e => console.error("Error starting restored player playback:", e));
      } else if (player.queue.tracks.length > 0 && !player.playing && !player.paused) {
        await player.play().catch(e => console.error("Error starting restored player playback:", e));
      }
    }
  } catch (err) {
    console.error("Error during fallback session restoration from DB:", err);
  }
});

client.manager.nodeManager.on('resumed', async (node, payload, fetchedPlayers) => {
  console.log(`Node "${node.id}" successfully resumed with ${fetchedPlayers?.length || 0} players.`);

  for (const lavalinkData of fetchedPlayers) {
    try {
      const savedData = await PlayerSession.findOne({ guildId: lavalinkData.guildId });

      if (!lavalinkData.state?.connected) {
        if (savedData) await PlayerSession.deleteOne({ guildId: lavalinkData.guildId });
        continue;
      }

      const voiceChannelId = savedData?.voiceChannelId || lavalinkData.voiceChannelId;
      const textChannelId = savedData?.textChannelId || lavalinkData.textChannelId;
      if (!voiceChannelId) continue;

      const player = client.manager.createPlayer({
        guildId: lavalinkData.guildId,
        voiceChannelId: voiceChannelId,
        textChannelId: textChannelId,
        node: node.id,
        volume: client.manager.options.playerOptions?.volumeDecrementer
          ? Math.round(lavalinkData.volume / client.manager.options.playerOptions.volumeDecrementer)
          : lavalinkData.volume,
        selfDeaf: savedData?.selfDeaf ?? true,
        customData: savedData?.customData || {},
      });

      await player.connect();

      if (lavalinkData.filters) {
        player.filterManager.data = lavalinkData.filters;
      }

      await player.queue.utils.sync(true, false).catch(() => null);

      if (savedData?.queueTracks && Array.isArray(savedData.queueTracks) && savedData.queueTracks.length > 0) {
        for (const rawTrack of savedData.queueTracks) {
          try {
            const builtTrack = client.manager.utils.buildTrack(rawTrack, rawTrack.requester || savedData.requester);
            if (builtTrack) player.queue.add(builtTrack);
          } catch (tErr) {
            console.error("Error restoring queued track:", tErr);
          }
        }
      }

      if (lavalinkData.track) {
        const req = savedData?.requester || player.queue.current?.requester || client.user;
        player.queue.current = client.manager.utils.buildTrack(lavalinkData.track, req);
      }

      player.lastPosition = lavalinkData.state.position;
      player.lastPositionChange = Date.now();
      if (lavalinkData.state.ping) player.ping.lavalink = lavalinkData.state.ping;

      player.paused = lavalinkData.paused;
      player.playing = !lavalinkData.paused && !!lavalinkData.track;
    } catch (err) {
      console.error(`Error resuming player for guild ${lavalinkData.guildId}:`, err);
    }
  }
});

const savePlayerSession = async (player) => {
  if (!player || !player.guildId) return;
  try {
    const queueTracksToSave = player.queue?.tracks?.map(t => ({
      encoded: t.encoded,
      info: t.info,
      requester: t.requester,
      userData: t.userData
    })) || [];

    const currentTrackToSave = player.queue?.current ? {
      encoded: player.queue.current.encoded,
      info: player.queue.current.info,
      requester: player.queue.current.requester,
      userData: player.queue.current.userData
    } : null;

    await PlayerSession.findOneAndUpdate(
      { guildId: player.guildId },
      {
        guildId: player.guildId,
        voiceChannelId: player.voiceChannelId,
        textChannelId: player.textChannelId || player.textId,
        volume: player.volume ?? 30,
        position: player.position || player.lastPosition || 0,
        paused: Boolean(player.paused),
        selfDeaf: player.options?.selfDeaf ?? true,
        currentTrack: currentTrackToSave,
        requester: player.queue?.current?.requester,
        customData: player.customData || {},
        queueTracks: queueTracksToSave,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("Error persisting player session to database:", err);
  }
};

client.manager.on("playerCreate", (player) => {
  savePlayerSession(player);
});

client.manager.on("playerUpdate", async (oldPlayer, newPlayer) => {
  savePlayerSession(newPlayer || oldPlayer);
});

client.manager.on("playerDestroy", async (player) => {
  try {
    await PlayerSession.deleteOne({ guildId: player.guildId });
  } catch (err) {
    console.error("Error deleting player session from database:", err);
  }
});
client.manager.nodeManager.on('error', (node, error) => {
  console.error(`Lavalink Node ${node.id}: Error Caught:`, error); 
});
client.manager.nodeManager.on('disconnect', (node, reason) => {
  console.warn(`Lavalink Node ${node.id}: Disconnected. Reason:`, reason);
});
client.manager.nodeManager.on('reconnect', (node) => {
  console.log(`Lavalink Node ${node.id}: Reconnecting...`);
});
if (process.env.DEBUG === "true") client.manager.on("debug", (info, data) => {
  console.error(`debug: ${info} - `, data);
});
client.manager.on("playerStuck", (player, data) => {
  console.error(`Player Stuck: ${player.guildId} - `, data);
  handleExcessiveLavalinkErrors(player, client.manager)
});
client.manager.on("playerException", async (player, data) => {
  const guild = client.guilds.cache.get(player.guildId);
  const guildName = guild ? guild.name : "Unknown Guild"; // Handle cases where guild is not found
  
  console.error(`Player Exception Error: Node: ${player.shoukaku.node.name}, Guild: ${guildName}(${player.guildId}) - `, data.exception); 
  handleExcessiveLavalinkErrors(player, client.manager)
  const channel = client.channels.cache.get(player.textId);
  if (!channel) return;  // Check if channel exists

  if (player.customData.playerMessages !== "noMessage") { 
    // Handle null/undefined exception cause and truncate to avoid Discord embed limit (4096 chars)
    const errorMessage = data.exception?.cause || data.exception?.message || 'Unknown error';
    const truncatedError = errorMessage.length > 1000 ? errorMessage.substring(0, 997) + '...' : errorMessage;
    
    let description = `Track: ${data.track.info.title}\nError: ${truncatedError}\nNode: ${player.shoukaku.node.name}\n-# Please join the [support server](https://discord.com/invite/rDHPK2er3j) if this keeps happening`;
    
    // Check for YouTube rate limiting errors
    const isYoutubeError = data.exception?.message?.includes('This video requires login.') || 
                          data.exception?.message?.includes('Sign in to confirm') ||
                          data.exception?.message?.includes('Not success status code: 403') ||
                          data.exception?.message?.includes('Video player configuration error') ||
                          data.exception?.message?.includes('Invalid status code for player api response: 400') ||
                          data.exception?.message?.includes('All clients failed to load the item');
    
    if (isYoutubeError) {
      description += `\n\n**Tip:** This is caused by youtube ratelimiting our servers. Try enabling direct Tidal or Spotify streaming in \`/player-settings\` (beta).`;
    }
    const embed = new EmbedBuilder()
      .setColor('#e66229')  
      .setTitle('Oops... seems something went wrong skipping to next!')
      .setDescription(description);
      try {
        if (player.customData?.playerMessages === "default") {
          const message = player.customData?.message;
          if (message) { 
            message.edit({ embeds: [embed], components: []}).catch(err => { if (!err.code === 50013) console.log("Error sending playerEnd message:", err)});
          } else { 
            channel.send({ embeds: [embed] }).catch(err => { if (!err.code === 50013) console.log("Error sending playerEnd message:", err)});
          }
      } else { 
          const message = player.customData?.message;
          if (message) message.delete().catch(err => { if (!err.code === 50013) console.log("Error sending playerEnd message:", err)});
      }

      } catch (err) {
          console.error("Error sending player exception message:", err);
      }
  }
});


  
client.manager.on("trackStart", async (player, track) => {
  savePlayerSession(player);
  checkQueueForNativePlay(player, client);
  checkQueueForTidalNativePlay(player, client); 
  if (player.customData?.message) {
    const prevMessage = player.customData.message;
    if (player.customData?.playerMessages === "deleteAfter") {
      prevMessage.delete().catch(err => { if (err.code !== 50013 && err.code !== 10008) console.log("Error deleting previous message:", err); });
    } else {
      prevMessage.edit({ components: [] }).catch(err => { if (err.code !== 50013 && err.code !== 10008) console.log("Error editing previous message buttons:", err); });
    }
    player.customData.message = null;
  }
  if (player.customData?.playerMessages === "noMessage") return;
  const channel = client.channels.cache.get(player.textChannelId || player.textId);
  const guild = client.guilds.cache.get(player.guildId);
  if (!guild) return;

  if (!guild.members.me.permissionsIn(channel).has(PermissionsBitField.Flags.ViewChannel)) {
    return;
  }
  if (!guild.members.me.permissionsIn(channel).has(PermissionsBitField.Flags.SendMessages)) {
    return;
  }

  const title = track?.info?.title || track?.title || "Missing Title";
  const uri = track?.info?.uri || track?.uri || track?.realUri || "https://youtube.com";
  const artworkUrl = track?.info?.artworkUrl || track?.thumbnail || "https://i.imgur.com/K9LWwgw.png";
  const duration = track?.info?.duration || track?.length || 0;
  const sourceName = track?.info?.sourceName || track?.sourceName;
  let req = track?.userData?.requester || track?.requester;
  if (req && typeof req === "object" && req.requester) req = req.requester;
  let requesterName = req?.globalName || req?.username;

  if (!requesterName) {
    const userId = req?.id || (typeof req === "string" && req.match(/^\d+$/) ? req : null);
    if (userId) {
      try {
        const fetchedUser = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
        if (fetchedUser) {
          requesterName = fetchedUser.globalName || fetchedUser.username;
          if (typeof track.requester === "object") {
            Object.assign(track.requester, fetchedUser);
          } else {
            track.requester = fetchedUser;
          }
        }
      } catch (fErr) {
        console.error("Error fetching requester user:", fErr);
      }
    }
  }

  if (!requesterName) {
    requesterName = (typeof req === "string" && !req.match(/^\d+$/) ? req : null) || "User";
  }

    const playerStartEmbed = new EmbedBuilder()
	.setColor('#e66229')
	.setTitle(title)
	.setURL(sourceName === 'spotify_native' ? uri : uri)
	.setThumbnail(artworkUrl)
    .setDescription(`Duration: **${convertTime(duration, true)}**`)
    .setTimestamp()
    .setFooter({ text: `Requested by: ${requesterName}${Math.random() < 0.06 ? ' | Dont want these messages? Disable them with /player-settings' : ''}`});

    switch (track.sourceName) {
        case 'spotify_native':
            playerStartEmbed.setAuthor({ name: 'Now Playing', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Spotify_icon.svg/1982px-Spotify_icon.svg.png' });
            break;
        case 'tidal_native':
            playerStartEmbed.setAuthor({ name: 'Now Playing', iconURL: 'https://images.icon-icons.com/2429/PNG/512/tidal_logo_icon_147227.png' });
            break;
        default:
            playerStartEmbed.setAuthor({ name: 'Now Playing' });
            break;
    }
    const playPauseButton = new ButtonBuilder().setCustomId('Pause').setEmoji('<:w_playpause:1106270708243386428>').setStyle(ButtonStyle.Primary);
    const skipButton = new ButtonBuilder().setCustomId('Skip').setEmoji('<:w_next:1106270714664849448>').setStyle(ButtonStyle.Success);
    const stopButton = new ButtonBuilder().setCustomId('Stop').setEmoji('<:w_stop:1106272001909346386>').setStyle(ButtonStyle.Danger);
    const loopButton = new ButtonBuilder().setCustomId('Loop').setEmoji('<:w_loop:1106270705575792681>').setStyle(ButtonStyle.Secondary);
    const shuffleButton = new ButtonBuilder().setCustomId('Shuffle').setEmoji('<:w_shuffle:1106270712542531624>').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder()
   .addComponents(playPauseButton, skipButton, stopButton, loopButton, shuffleButton);
   let message = null;
   try {
    message = await channel.send({ embeds: [playerStartEmbed], components: [row] }).catch(err => { if (!err.code === 50013) console.log("Error sending playerStart message:", err)});
   } catch (err) {
    if (err.code === 50013) {
        return;
    } else {
        console.error("Error sending playerStart message:", err);
        return;
    }
   }
   if (!message) return;
   if (!player.customData) player.customData = {};
   player.customData.message = message;
       let ms = track?.length || "300000";
       if (ms < "300000") {
        } else {
         ms = "300000";
        }
       const collector = message?.createMessageComponentCollector({
        idle: ms,
        });
          collector.on("end", async () => {
            if (player.customData?.playerMessages === "default") {
            try {
              const fetchedMessage = await message.channel.messages.fetch(message.id)
              fetchedMessage.edit({
                components: [],
              }).catch(err => { if (!err.code === 50013) console.log("Error removing playerStart Buttons", err)});
            } catch (error) {
              return;
            }
          } else {
            try {
              const fetchedMessage = await message.channel.messages.fetch(message.id)
              fetchedMessage.delete().catch(err => { if (!err.code === 50013) console.log("Error Deleting playerStart Message", err)});
            } catch (error) {
              return;
            }
          }

          })
});

client.manager.on("queueEnd", async (player) => {
  if (player.customData?.autoPlay) {
    try {
      const history = [...(player.queue.previous || [])].reverse();
      const lastTrack = history[0] || player.queue.current;
      if (!lastTrack) return;

      let id = lastTrack.info?.identifier || lastTrack.identifier;
      let res = null;
      if (id) {
        res = await player.search({ query: `https://music.youtube.com/watch?v=${id}&list=RD${id}` }, { username: "Autoplay" }).catch(() => null);
      }
      if (!res || !res.tracks?.length) {
        const title = lastTrack.info?.title || lastTrack.title || "";
        const author = lastTrack.info?.author || lastTrack.author || "";
        if (title) {
          res = await player.search({ query: `${title} ${author}`.trim(), source: "ytmsearch" }, { username: "Autoplay" }).catch(() => null);
        }
      }

      if (res?.tracks?.length) {
        const filter = MetadataFilter.createSpotifyFilter();
        filter.extend(MetadataFilter.createAmazonFilter());
        const lastFiveTracks = history.slice(0, 5);

        const filteredHistoryTitles = lastFiveTracks.map((track) => {
          const tName = track.info?.title || track.title || "";
          return MetadataFilter.youtube(tName).toLowerCase();
        });

        const filteredTracks = res.tracks.filter((track) => {
          const tName = (track.info?.title || track.title || "").toLowerCase();
          return !filteredHistoryTitles.some((historyTrack) => historyTrack && tName.includes(historyTrack));
        });

        const randomTrack = (filteredTracks.length ? filteredTracks : res.tracks)[Math.floor(Math.random() * (filteredTracks.length || res.tracks.length))];

        if (randomTrack) {
          player.queue.add(randomTrack);
          if (!player.playing && !player.paused) await player.play();
          return;
        }
      }
    } catch (error) {
      console.error("Error while running lavalink autoplay:", error);
    }
  }

  if (player.customData?.playerMessages === "default") {
    player.customData.message?.edit({ components: [] }).catch(err => { if (err.code !== 50013 && err.code !== 10008) console.log("Error editing playerEnd message:", err); });
  } else {
    player.customData.message?.delete().catch(err => { if (err.code !== 50013 && err.code !== 10008) console.log("Error deleting playerEnd message:", err); });
  }
});
}