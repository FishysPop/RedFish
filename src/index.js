require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const { SpotifyExtractor, SoundCloudExtractor } = require('@discord-player/extractor');
const { CommandHandler } = require('djs-commander');
const { Player } = require('discord-player');
const { Kazagumo, Plugins } = require("kazagumo");
const Spotify = require('kazagumo-spotify');
const Deezer = require('kazagumo-deezer');
const { Connectors } = require("shoukaku");
const fs = require('fs');
const Topgg = require("@top-gg/sdk");



const path = require('path');
const client = new Client({
  shards: "auto",
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ],
});


if (process.env.DISCORD_PLAYER === 'true') {
  const fileExists = fs.existsSync('YT_cookies.json');
  let YTCookies = ''

if (fileExists) {
  const data = fs.readFileSync('YT_cookies.json', 'utf8');
   YTCookies = JSON.parse(data);
 } else {
  YTCookies =  ''
  console.log("Youtube Cookies Disabled")
  /*
  if you want to enable cookies create a file called YT_cookies.json in the main directory
  How to get cookies
  Install EditThisCookie extension for your browser.
  Go to YouTube.
  Log in to your account. (You should use a new account for this purpose)
  Click on the extension icon and click "Export" icon.
  Your cookie will be added to your clipboard and paste it into your code.
  */
  }
  const ipconfig = process.env.IPV6_BLOCK ? {
    blocks: [process.env.IPV6_BLOCK],
    maxRetries: 5
  } : null;

  player = new Player(client, {
    deafenOnJoin: true,
    lagMonitor: 1000,
    skipFFmpeg: false,
    ipconfig,
    ytdlOptions: {
      quality: 'highestaudio',
      highWaterMark: 1 << 30,
      dlChunkSize: 0,
      requestOptions: {
        headers: {
            cookie: YTCookies
        }
    }
    },
  });
  require('./events/playerEvents/playerEvents')
  const playCommand = require('./commands/music/play');
  client.commands = new Collection();
  client.commands.set('play', playCommand);
}
if (process.env.LAVALINK === 'true') {
  const lavaNodes = []
  const lavaURI = process.env.LAVALINK_URI; 
  if (lavaURI) {
    const nodes = lavaURI.split(';');
    nodes.forEach((node, index) => {
      const [ip, portAndAuth] = node.split(':');
      if (portAndAuth) {
        const [port, password] = portAndAuth.split('@');
        lavaNodes.push({
          name: `${process.env.NAME}${index + 1}`,
          url: `${ip}:${port}`, 
          auth: password, 
          secure: false 
        });
      } else {
        console.warn(`Invalid Lavalink node configuration: ${node}`);
      }
    });
  } else {
    console.warn('No Lavalink node configuration found. eg LAVALINK_URI = YOUR_IP:PORT@PASSWORD');
  }
  client.manager = new Kazagumo({
    defaultSearchEngine: "youtube",
    plugins: [
      new Plugins.PlayerMoved(client),
      new Deezer({
        playlistLimit: 20
      }),
      new Spotify({
      clientId: process.env.SPOTIFY_ID,
      clientSecret: process.env.SPOTIFY_SECRET,
      playlistPageLimit: 2, // ( 100 tracks per page )
      albumPageLimit: 4, //( 50 tracks per page )
      searchLimit: 10, // ( track search limit. Max 50 )
      searchMarket: 'US', //( eg: US, IN, EN ] )//
    }),],
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
}, new Connectors.DiscordJS(client), lavaNodes, {
  reconnectInterval: 20,
  moveOnDisconnect: true,
  resume: true,
  resumeByLibrary: true,
  reconnectTries: 10,
  resumeTimeout: 60,
});
require('./events/lavaEvents/lavaEvents.js')(client)
}

if (process.env.DISCORD_PLAYER !== 'true' && process.env.LAVALINK !== 'true') {
  throw new Error('You need to enable at least one player for the bot to work. Please enable either discord-player or lavalink.');
}

if (process.env.DISCORD_PLAYER === 'true' && process.env.LAVALINK === 'true') {
  playerType = 'both';
} else if (process.env.DISCORD_PLAYER === 'true') {
  playerType = 'discord_player';
} else if (process.env.LAVALINK === 'true') {
  playerType = 'lavalink';
}
client.totalTracksPlayed = 0;
client.playerType = playerType;
console.log("Player Type:",client.playerType);
require('./events/errors/handleErrors.js')(client);

if (process.env.TOP_GG) {
  client.topgg = new Topgg.Api(process.env.TOP_GG);
} else {
  console.log("Top.gg Disabled")
}



new CommandHandler({
  client,
  commandsPath: path.join(__dirname, 'commands'),
  eventsPath: path.join(__dirname, 'events'),
  //testServer: process.env.GUILD_ID,
});

(async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB.");
    require('./events/giveawayEvents/checkGiveaway')(client);
    if (client.playerType === 'discord_player' | client.playerType === 'both') await player.extractors.loadDefault();
    client.login(process.env.TOKEN); 
  } catch (error) {
    console.log(`Error: ${error}`);
  }
})();
module.exports = client;