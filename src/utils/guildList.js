const { Client, GatewayIntentBits } = require('discord.js');
require("dotenv").config();
const token = process.env.TOKEN;
const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      // Add any other intents your bot needs
    ],
  });

client.once('ready', async () => {
    try {
        await client.login(token);
        console.log('Bot is ready!');

        const guilds = client.guilds.cache;

        console.log('Guild Index:');
        guilds.forEach(guild => {
            console.log(`${guild.name} - Members: ${guild.memberCount}`);
        });

        client.destroy();
    } catch (error) {
        console.error('Error logging in:', error.message);
    }


});

