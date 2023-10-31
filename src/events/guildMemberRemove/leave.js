const { Client } = require('discord.js');
const Welcome = require('../../models/Welcome');

module.exports = async (member, client, handler) => {
    const guild = member.guild;
    const welcome = await Welcome.findOne({ guildId: guild.id });

    if (member.id === client.user.id) return;
    if (!guild) return;
    if (!welcome) return;
    
    try {
        if (guild.channels.cache.get(welcome.channel)) {
            if (welcome.typeArray.includes('leaveMessage')) {
                const channel = await client.channels.cache.get(welcome.channel);
                const userMessage = welcomeData.leaveMessage.replace('(user)', `${member.user}`);
                const message = userMessage.replace('(server)', `${member.guild}`);
                channel.send(`${message}`).catch((err) => {
                    client.users.send(guild.ownerId, `I do not have permissions to send messages in ${channel}`);
                });
            }
        }
    } catch (error) {
        client.users.send(guild.ownerId, 'Welcome channel has been deleted please disable leave welcome or set it up again');
        console.log(`error while sending leave message: ${error}`);
    }
};
