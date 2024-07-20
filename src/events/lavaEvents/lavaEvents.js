const { EmbedBuilder, Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField} = require('discord.js')
const { convertTime } = require("../../utils/ConvertTime.js");
const MetadataFilter = require('@web-scrobbler/metadata-filter');
require("dotenv").config();


module.exports = (client) => {
client.manager.shoukaku.on('ready', (name) => console.log(`Lavalink ${name}: Ready!`));
client.manager.shoukaku.on('error', (name, error) => console.error(`Lavalink ${name}: Error Caught,`, error));
client.manager.shoukaku.on('close', (name, code, reason) => console.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`));
if (process.env.DEBUG === "true") client.manager.shoukaku.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug,`, info));
client.manager.shoukaku.on('disconnect', (name, players, moved) => {
    if (moved) return;
    try {
    players.map(player => player.connection.disconnect())
    console.warn(`Lavalink ${name}: Disconnected`);
  } catch (error) {   
  }
});

client.manager.on("playerStart", async (player, track) => {
  if (player.customData.playerMessages === "noMessage") return;
  const channel = client.channels.cache.get(player.textId);
  const guild = client.guilds.cache.get(player.guildId);

  if (!guild.members.me.permissionsIn(channel).has(PermissionsBitField.Flags.ViewChannel)) {
    return;
  }
  if (!guild.members.me.permissionsIn(channel).has(PermissionsBitField.Flags.SendMessages)) {
    return;
  }
    const playerStartEmbed = await new EmbedBuilder() //embed
	.setColor('#e66229')
	.setTitle(track?.title)
	.setURL(track?.realUri)
	.setAuthor({ name: 'Now Playing'})
	.setThumbnail(track?.thumbnail)
    .setDescription(`Duration: **${convertTime(track?.length || 0, true)}**`)
    .setTimestamp()
    .setFooter({ text: `Requested by: ${track?.requester?.username}`});
    const playPauseButton = new ButtonBuilder().setCustomId('LavaPause').setEmoji('<:w_playpause:1106270708243386428').setStyle(ButtonStyle.Primary);
    const skipButton = new ButtonBuilder().setCustomId('LavaSkip').setEmoji('<:w_next:1106270714664849448').setStyle(ButtonStyle.Success);
    const stopButton = new ButtonBuilder().setCustomId('LavaStop').setEmoji('<:w_stop:1106272001909346386>').setStyle(ButtonStyle.Danger);
    const loopButton = new ButtonBuilder().setCustomId('LavaLoop').setEmoji('<:w_loop:1106270705575792681>').setStyle(ButtonStyle.Secondary);
    const shuffleButton = new ButtonBuilder().setCustomId('LavaShuffle').setEmoji('<:w_shuffle:1106270712542531624>').setStyle(ButtonStyle.Secondary);
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
   player.data.set("message", message);
       let ms = track.length
       if (ms < "300000") {
        } else {
         ms = "300000";
        }
       const collector = message?.createMessageComponentCollector({
        idle: ms,
        });
          collector.on("end", async () => {
            if (player.customData.playerMessages === "default") {
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

client.manager.on("playerEnd", (player) => {
  if (player.customData.playerMessages === "default") {
    player.data.get("message")?.edit({
        components: [],
      }).catch(err => { if (!err.code === 50013) console.log("Error editing playerEnd message:", err)});
    } else {
      player.data.get("message")?.delete().catch(err => { if (!err.code === 50013) console.log("Error editing playerEnd message:", err)});
    }

});

client.manager.on("playerEmpty", async player => {
  try {
  if (player.customData.autoPlay === false) return;
    const history = player.queue.previous.reverse()
    const lastOption = history[0]
  let res;
  const randomNumber = Math.floor(Math.random() * 4) + 1;
  if (randomNumber === 2) {
    res = await player.search(`${lastOption.title}`, {engine: 'youtube_music' ,requester: { username: "Autoplay" } })
  } else {
    res = await player.search(`${lastOption.author}`, {engine: 'youtube_music' ,requester: { username: "Autoplay" } })

  }
 const filter = MetadataFilter.createSpotifyFilter();
 filter.extend(MetadataFilter.createAmazonFilter());
 const lastFiveTracks = history.slice(0, 5);


  const filteredHistoryTitles = []; // Initialize an empty array
  lastFiveTracks.forEach(async track => {
    let title = MetadataFilter.youtube(track.title)
    filteredHistoryTitles.push(title) // Push the filtered title to the array
});
  const filteredlastOptionTitle = MetadataFilter.youtube(lastOption.title)


  // Filter the search results to only include tracks with titles that match the last played track's title (ignoring case)
  const filteredTracks = res.tracks.filter(track => {
    return !track.title.toLowerCase().includes(filteredlastOptionTitle.toLowerCase());
  });
  // Filter the search results to only include tracks that are not in the last 5 tracks of the history
  const filteredTracks2 = filteredTracks.filter(track => {
    return !filteredHistoryTitles.some(historyTrack => track.title.toLowerCase().includes(historyTrack.toLowerCase()));
  });

  let randomTrack;
  if (filteredTracks2.length < 1 ) {    
    const randomIndex = Math.floor(Math.random() * res.tracks.length);
    randomTrack = res.tracks[randomIndex];
} else {
  const randomIndex = Math.floor(Math.random() * filteredTracks2.length);
  randomTrack = filteredTracks2[randomIndex];
}
  player.queue.add(randomTrack);
  if (!player.playing && !player.paused) player.play();
} catch (error) {
    console.log("error while running lavalink autoplay", error)
}
});


}
