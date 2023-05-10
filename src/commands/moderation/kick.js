const {
  Client,
  Interaction,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
    //deleted: true,

  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */

  run: async ({client, interaction}) => {
    const targetUserId = interaction.options.get('user').value;
    await interaction.deferReply();

    const targetUser = await interaction.guild.members.fetch(targetUserId);

    if (!targetUser) {
      await interaction.editReply("That user doesn't exist in this server.");
      return;
    }

    if (targetUser.id === interaction.guild.ownerId) {
      await interaction.editReply(
        "You can't kick that user because they're the server owner."
      );
      return;
    }

    const targetUserRolePosition = targetUser.roles.highest.position; // Highest role of the target user
    const requestUserRolePosition = interaction.member.roles.highest.position; // Highest role of the user running the cmd
    const botRolePosition = interaction.guild.members.me.roles.highest.position; // Highest role of the bot

    if (targetUserRolePosition >= requestUserRolePosition) {
      await interaction.editReply(
        "You can't kick that user because they have the same/higher role than you."
      );
      return;
    }

    if (targetUserRolePosition >= botRolePosition) {
      await interaction.editReply(
        "I can't kick that user because they have the same/higher role than me."
      );
      return;
    }

    // Ban the targetUser
    try {
      await targetUser.kick();
      await interaction.editReply(
        `User ${targetUser} was kicked`
      );
    } catch (error) {
      console.log(`There was an error when kicking: ${error}`);
    }
  },
  data: new SlashCommandBuilder()
  .setName('kick')
  .setDescription("kick a user.")
  .addMentionableOption(option =>
    option.setName('user')
    .setDescription('The users who u want to kick')
    .setRequired(true)),
  permissionsRequired: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
};