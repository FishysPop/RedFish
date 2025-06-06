const {Client,Interaction, PermissionsBitField ,SlashCommandBuilder, MessageFlags} = require('discord.js');

module.exports = {
  run: async ({interaction, handler}) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      interaction.reply({content: 'Only server admins can run this comamand', flags: MessageFlags.Ephemeral})
      return;
   }    
   if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
    interaction.reply({content: 'I dont have BanMembers permissions', flags: MessageFlags.Ephemeral})
    return;
 }    
   if (!interaction.inGuild()) {
    interaction.reply({
      content: "You can only run this command in a server.",
      flags: MessageFlags.Ephemeral,
    });
   return;
  }
    const targetUserId = interaction.options.get('user')
    await interaction.deferReply();

    const targetUser = await interaction.guild.members.fetch(targetUserId);

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
  permissionsRequired: [PermissionsBitField.Flags.BanMembers],
  botPermissions: [PermissionsBitField.Flags.BanMembers],
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};