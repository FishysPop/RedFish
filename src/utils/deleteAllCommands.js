const { Client, GatewayIntentBits } = require('discord.js');
require("dotenv").config();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Add any other intents your bot needs
  ],
});

const TOKEN = process.env.TOKEN;

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Get a list of all global commands
  const commands = await client.application.commands.fetch();
  
  // Delete each global command
  for (const command of commands.values()) {
    await client.application.commands.delete(command.id);
    console.log(`Deleted global command: ${command.name}`);
  }
  
  console.log('All global commands have been unregistered.');
  process.exit();
});

client.login(TOKEN);
