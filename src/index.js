require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const { SpotifyExtractor, SoundCloudExtractor } = require('@discord-player/extractor');
const { CommandHandler } = require('djs-commander');
const { Player } = require('discord-player');
const { Kazagumo, Plugins } = require("kazagumo");
const Spotify = require('kazagumo-spotify');
const { Connectors } = require("shoukaku");


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
  player = new Player(client, {
    deafenOnJoin: true,
    lagMonitor: 1000,
    skipFFmpeg: false,
    ytdlOptions: {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 30,
      dlChunkSize: 0,
    },
  });
  require('./events/playerEvents/playerEvents')
  const playCommand = require('./commands/music/play');
  client.commands = new Collection();
  client.commands.set('play', playCommand);
}
if (process.env.LAVALINK === 'true') {
  const Nodes = [{
    name: process.env.NAME,
    url: process.env.LAVALINK_URL,
    auth: process.env.LAVALINK_AUTH,
    secure: false
}];
  client.manager = new Kazagumo({
    defaultSearchEngine: "youtube",
    plugins: [
      new Plugins.PlayerMoved(client),
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
}, new Connectors.DiscordJS(client), Nodes);
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
client.playerType = playerType;
console.log(client.playerType);
require('./events/errors/handleErrors.js')(client);


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