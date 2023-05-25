const {
  SlashCommandBuilder,
} = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Pings the Bot'),
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,

  run: ({ interaction, client, handler }) => {
    const reply = interaction.fetchReply();
    const ping = reply.createdTimestamp - interaction.createdTimestamp;

    interaction.reply(
      `Pong! Client ${ping}ms | Websocket: ${Math.round(client.ws.ping)}ms`
    );
  },
};
