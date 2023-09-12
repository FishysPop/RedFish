const { Client, GatewayIntentBits } = require('discord.js');
require("dotenv").config();
const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      // Add any other intents your bot needs
    ],
  });
const token = process.env.TOKEN;
const guildId = process.env.GUILD_ID;

client.login(token);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  try {
    await deleteGuildCommands(guildId);
    console.log(`Deleted all commands in guild with ID: ${guildId}`);
  } catch (error) {
    console.error(`Failed to delete commands in guild with ID: ${guildId}\nError: ${error.message}`);
  }
});

async function deleteGuildCommands(guildId) {
  const commands = await client.guilds.cache.get(guildId).commands.fetch();
  
  commands.forEach(async (command) => {
    try {
      await command.delete();
    } catch (error) {
      console.error(`Failed to delete command ${command.name} in guild with ID ${guildId}: ${error.message}`);
    }
  });
}
