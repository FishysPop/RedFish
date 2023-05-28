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
 interaction.reply("testing the test...")

 
  },
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};
