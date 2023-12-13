const {SlashCommandBuilder,} = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Pings the Bot'),


  run: async ({ interaction, client, handler }) => {
    try {
    await interaction.deferReply();

	  const reply = await interaction.fetchReply();

	  const ping = reply.createdTimestamp - interaction.createdTimestamp;
  
	  interaction.editReply(
		`Pong! Client ${ping}ms | Websocket: ${client.ws.ping}ms`
	  );
          
  } catch (error) {
   console.log("error while running ping",error)   
  }
  },
  // devOnly: Boolean,
  //testOnly: true,
  //deleted: true,
};
