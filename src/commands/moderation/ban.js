const {
  Client,
  Interaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');


module.exports = {
    //deleted: true,
  /**
   *
   * @param {Client} client
   * @param {SlashCommandBuilder} interaction
   */

  run: async ({interaction, handler}) => {
    const targetUserId = interaction.options.get('user')
    await interaction.deferReply();

    const targetUser = await interaction.guild.members.fetch(targetUserId);
    console.log(targetUser.roles.highest.position)

    if (!targetUser) {
      await interaction.editReply("That user doesn't exist in this server.");
      return;
    }

    if (targetUser.id === interaction.guild.ownerId) {
      await interaction.editReply(
        "You can't ban that user because they're the server owner."
      );
      return;
    }

    const targetUserRolePosition = targetUser.roles.highest.position; // Highest role of the target user
    const requestUserRolePosition = interaction.member.roles.highest.position; // Highest role of the user running the cmd
    const botRolePosition = interaction.guild.members.me.roles.highest.position; // Highest role of the bot

    if (targetUserRolePosition >= requestUserRolePosition) {
      await interaction.editReply(
        "You can't ban that user because they have the same/higher role than you."
      );
      return;
    }

    if (targetUserRolePosition >= botRolePosition) {
      await interaction.editReply(
        "I can't ban that user because they have the same/higher role than me."
      );
      return;
    }

    // Ban the targetUser
    try {
      await targetUser.ban();
      await interaction.editReply(
        `User ${targetUser} was banned`
      );
    } catch (error) {
      console.log(`There was an error when banning: ${error}`);
    }
  },

  data: new SlashCommandBuilder()
  .setName('ban')
  .setDescription("Bans a user.")
  .addUserOption((option) => option
  .setName('user')
  .setDescription('The users who u want to ban')
  .setRequired(true)),
  permissionsRequired: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
};