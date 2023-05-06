const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  AttachmentBuilder,
} = require('discord.js');
const User = require('../../models/User');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      interaction.reply('You can only run this command inside a server.');
      return;
    }
    const targetUserId = interaction.options.get('user')?.value || interaction.member.id;

    await interaction.deferReply();

    const user = await User.findOne({ userId: targetUserId });


    if (!user) {
      interaction.editReply(`<@${targetUserId}> is broke.`);
      return;
    }

    interaction.editReply(
      targetUserId === interaction.member.id
      ? `Your balance is **${user.balance}**`
      : `@${targetUserId}>'s balance is **${user.balance}**`
      );
  },

  name: 'balance',
  description: "Shows your/someone's balance.",
  // devOnly: Boolean,
  // testOnly: true,
  // options: Object[],
  // deleted: Boolean,
  options: [
    {
      name: 'user',
      description: 'The user whose balance you want to see.',
      type: ApplicationCommandOptionType.Mentionable,
    },
  ],
};