require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, } = require("discord.js");
const mongoose = require("mongoose");
const { CommandHandler } = require('djs-commander');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
});

new CommandHandler({
  client,
  commandsPath: path.join(__dirname, 'commands'),
  eventsPath: path.join(__dirname, 'events'),
  testServer: '870670135248158730',
});
(async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.MONGODB_URI, { keepAlive: true });
    console.log("Connected to DB.");
    client.login(process.env.TOKEN);
  } catch (error) {
    console.log(`Error: ${error}`);
  }
})();
