const {Client,Interaction, PermissionsBitField ,SlashCommandBuilder, MessageFlags} = require('discord.js');

module.exports = {
  run: async ({ interaction }) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      interaction.reply({ content: 'Only server admins can run this comamand.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      interaction.reply({ content: "I don't have BanMembers permissions.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!interaction.inGuild()) {
      interaction.reply({
        content: 'You can only run this command in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    await interaction.deferReply();

    if (!targetUser) {
      await interaction.editReply("That user doesn't exist in this server.");
      return;
    }

    if (targetUser.id === interaction.guild.ownerId) {
      await interaction.editReply("You can't ban that user because they're the server owner.");
      return;
    }

    const targetUserRolePosition = targetUser.roles.highest.position;
    const requestUserRolePosition = interaction.member.roles.highest.position;
    const botRolePosition = interaction.guild.members.me.roles.highest.position;

    if (targetUserRolePosition >= requestUserRolePosition) {
      await interaction.editReply("You can't ban that user because they have the same/higher role than you.");
      return;
    }

    if (targetUserRolePosition >= botRolePosition) {
      await interaction.editReply("I can't ban that user because they have the same/higher role than me.");
      return;
    }

    try {
      await targetUser.send(`You were banned from ${interaction.guild.name}.\nReason: ${reason}`);
    } catch (error) {
      console.log(`Could not send ban DM to ${targetUser.id}`);
    }

    try {
      await targetUser.ban({ reason });
      await interaction.editReply(`User ${targetUser} was banned.\nReason: ${reason}`);
    } catch (error) {
      console.log(`There was an error when banning: ${error}`);
      await interaction.editReply(`There was an error banning ${targetUser}.`);
    }
  },

  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user from the server.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to ban.')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('The reason for the ban.')
    ),
  permissionsRequired: [PermissionsBitField.Flags.BanMembers],
  botPermissions: [PermissionsBitField.Flags.BanMembers],
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};