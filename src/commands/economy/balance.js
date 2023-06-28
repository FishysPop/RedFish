const {Client,Interaction,ApplicationCommandOptionType,AttachmentBuilder,SlashCommandBuilder,} = require('discord.js');
const User = require('../../models/User');

module.exports = {
  run: async ({client, interaction}) => {
    if (!interaction.inGuild()) {
      interaction.reply('You can only run this command inside a server.');
      return;
    }
    const targetUserId = interaction.options.get('user')?.value || interaction.member.id;
 
    await interaction.deferReply();

    const user = await User.findOne({ userId: targetUserId });


    if (!user) {
      interaction.editReply(`<@${targetUserId}> has no money.`);
      return;
    }

    interaction.editReply(
      targetUserId === interaction.member.id
      ? `Your balance is **${user.balance}**`
      : `@${targetUserId}>'s balance is **${user.balance}**`
      );
  },
  data: new SlashCommandBuilder()
  .setName('balance')
  .setDescription("Check yours or someone elses balance")
  .addUserOption((option) => option
  .setName('user')
  .setDescription('Whos balance you want to see')),
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};