const {SlashCommandBuilder,} = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Pings the Bot'),


  run: async ({ interaction, client, handler }) => {
    await interaction.deferReply();

    const reply = await interaction.fetchReply();

    const ping = reply.createdTimestamp - interaction.createdTimestamp;

    interaction.editReply(
      `Pong! Client ${ping}ms | Websocket: ${client.ws.ping}ms`
    );
  },
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};
