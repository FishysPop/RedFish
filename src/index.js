require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, } = require("discord.js");
const mongoose = require("mongoose");
const { SpotifyExtractor, SoundCloudExtractor } = require('@discord-player/extractor');
const { CommandHandler } = require('djs-commander');
const { Player } = require('discord-player');
const path = require('path');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ],
});

player = new Player(client, {
  deafenOnJoin: true,
  lagMonitor: 1000,
  ytdlOptions: {
    filter: "audioonly",
    quality: "highestaudio",
    highWaterMark: 1 << 25
  },
});

require('./events/playerEvents/playerEvents')
new CommandHandler({
  client,
  commandsPath: path.join(__dirname, 'commands'),
  eventsPath: path.join(__dirname, 'events'),
  testServer: '870670135248158730',
});

(async () => {
  try {
    mongoose.set("strictQuery", false);
    //await mongoose.connect(process.env.MONGODB_URI, { keepAlive: true });
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB.");
    await player.extractors.loadDefault();
    client.login(process.env.TOKEN); 
  } catch (error) {
    console.log(`Error: ${error}`);
  }
})();

module.exports = { client };
