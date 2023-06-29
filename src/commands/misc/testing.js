const {Client,Interaction,SlashCommandBuilder,PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const Welcome = require('../../models/Welcome');
//
module.exports = {
      /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  data: new SlashCommandBuilder()
  .setName('test')
  .setDescription('for testing commands'),
 

  run: async ({ interaction, client, handler }) => {
    const date = new Date(); // Replace with your JavaScript Date object
    const dateWithDuration = new Date(date.getTime() + 604800000)
    const unixTimestamp = Math.floor(dateWithDuration.getTime() / 1000);
    const timestamp = `<t:${unixTimestamp}:R>`;
    interaction.reply(`testing the test...${timestamp}`)

 
  },
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};
