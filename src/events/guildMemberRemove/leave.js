const { Client, GuildMember } = require('discord.js');
const Welcome = require('../../models/Welcome');

module.exports = async (member, client ,handler) => {
    let guild = member.guild;

    if (member.id === client.user.id) return;
    if (!guild) return;
    if (guild.channels.cache.get(welcome.channel)) {
        const welcome = await Welcome.findOne({ guildId: guild.id });
        console.log(welcome.type)
        if (!welcome) return;
        if (welcome.type === 3) return;
        if (welcome.type === 1) return;
        const channel = client.channels.cache.get(welcome.channel);
        const userMessage = welcome.leaveMessage.replace('(user)',`${member.user}`);
        const message = userMessage.replace('(server)',`${member.guild}`);
        channel.send(`${message}`).catch((err) => {client.users.send(guild.ownerId, `I do not have permissions to send messages in ${channel}`);});
    } else {
        client.users.send(guild.ownerId, 'Welcome channel has been deleted please disable welcome or set it up again');
    }
};