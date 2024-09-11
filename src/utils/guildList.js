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
        console.log(`${client.user.tag} is online`);

        let guilds = Array.from(client.guilds.cache.values()); 

        // Sort guilds by memberCount
        guilds.sort((a, b) => b.memberCount - a.memberCount);
        guilds = guilds.reverse(); // Reassign the reversed array

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
