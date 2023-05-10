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

  run: async({ interaction, client, handler }) => {
    interaction.reply(
      `Pong! ${client.ws.ping}ms`
    );
  },
};
