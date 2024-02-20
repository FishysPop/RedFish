const {Client,Interaction,SlashCommandBuilder,PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, ChannelSelectMenuBuilder } = require('discord.js');
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
    const owner = '406487515751514112'
    if (interaction.user.id === owner ) {
      const testEmbed = await new EmbedBuilder()
      .setColor("#e66229")
      .setDescription(`test.`);
    interaction.channel.send({embeds: [testEmbed]})
  }
  },
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};
