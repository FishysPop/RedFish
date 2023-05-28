const { Client, GuildMember } = require('discord.js');
const Welcome = require('../../models/Welcome');

module.exports = async (member, client ,handler) => {
    let guild = member.guild;
    const welcome = await Welcome.findOne({ guildId: guild.id });
    if (!guild) return;
    if (!welcome) return;
    console.log(guild.channels.cache.get)
    if (guild.channels.cache.get(welcome.channel)) {
            const channel = client.channels.cache.get(welcome.channel);
            const userMessage = welcome.welcomeMessage.replace('(user)',`${member.user}`);
            const message = userMessage.replace('(server)',`${member.guild}`);
            channel.send(`${message}`).catch((err) => {client.users.send(guild.ownerId, `I do not have permissions to send messages in ${channel}`);});
            client.users.send(guild.ownerId, `I do not have permissions to send messages in ${channel}`);
    } else {
        client.users.send(guild.ownerId, 'Welcome channel has been deleted please disable welcome or set it up again');
    }
 
};