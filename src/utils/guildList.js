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
        console.log('Bot is ready!');

        const guilds = Array.from(client.guilds.cache.values()); // Convert guilds collection to an array

        // Sort guilds by memberCount
        guilds.sort((a, b) => b.memberCount - a.memberCount);

        console.log('Guild Index:');
        guilds.forEach(guild => {
            console.log(`${guild.name}(${guild.id}) - Members: ${guild.memberCount}`);
        });

        client.destroy();
    } catch (error) {
        console.error('Error logging in:', error.message);
    }
});

client.login(token);
