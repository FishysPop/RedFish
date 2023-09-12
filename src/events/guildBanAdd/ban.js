const { Client, GuildMember } = require('discord.js');
const Welcome = require('../../models/Welcome');

module.exports = async (ban, client ,handler) => {
  const guild = ban.guild;
  const welcome = await Welcome.findOne({ guildId: guild.id });

  if (!welcome) return;
  if (!guild) return;
  try {
    if (welcome.type === 2) return;
    if (welcome.type === 1) return;
    const channel = client.channels.cache.get(welcome.channel);
    const userMessage = welcome.banMessage.replace('(user)',`${ban.user}`);
    const message = userMessage.replace('(server)',`${ban.guild}`);
    channel.send(`${message}`).catch((err) => {client.users.send(guild.ownerId, `I do not have permissions to send messages in ${channel}`);});
} catch (error) {
   client.users.send(guild.ownerId, 'Welcome channel has been deleted please disable welcome or set it up again');
    console.log(`Error while sending ban message: ${error}`);
  }
};