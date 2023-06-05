const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
  .setName('serverinfo')
  .setDescription('Shows information about this server'),

  run: async ({ interaction }) => {
   const { guild } = interaction;
   const owner = (await guild.fetchOwner()).user.tag
   const textChannels = guild.channels.cache.filter((c) => c.type === 0).toJSON().length
   const voiceChannels = guild.channels.cache.filter((c) => c.type === 2).toJSON().length
   const category = guild.channels.cache.filter((c) => c.type === 4).toJSON().length
   const members = guild.memberCount
   const roles = guild.roles.cache.size
   const rolelist = guild.roles.cache.toJSON().join(', ')

   const embed = await new EmbedBuilder()
   .setAuthor({name: `${guild.name}`})
   .setColor('#e66229')
   .setURL(guild.iconURL({ size: 256}))
   .addFields([
     { name: "Owner", value: `${owner}`, inline: true },        
     { name: "Text Channels", value: `${textChannels}`, inline: true },        
     { name: "Voice Channels", value: `${voiceChannels}`, inline: true },        
     { name: "Category", value: `${category}`, inline: true },        
     { name: "Members", value: `${members}`, inline: true },    
     { name: "Roles", value: `${roles}`, inline: true },        
     { name: "Role List", value: `${rolelist}`}])
   .setFooter({ text: `ID ${guild.id} | Server Created: ${guild.createdAt.toDateString()}` });

  interaction.reply({embeds: [embed]});
}
  // devOnly: Boolean,
  //testOnly: true,
  //deleted: true,
}
