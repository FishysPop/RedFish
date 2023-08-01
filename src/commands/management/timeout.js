const { Client, Interaction, SlashCommandBuilder, PermissionFlagsBits ,PermissionsBitField} = require('discord.js');
const ms = require('ms');

module.exports = {
  run: async ({client, interaction}) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      interaction.reply({content: 'Only server admins can run this comamand', ephemeral: true})
      return;
   }    
   if (!interaction.inGuild()) {
    interaction.reply({
      content: "You can only run this command in a server.",
      ephemeral: true,
    });
   return;
  }
    const mentionable = interaction.options.get('user').value;
    const duration = interaction.options.get('duration').value; // 1d, 1 day, 1s 5s, 5m
    await interaction.deferReply();

    const targetUser = await interaction.guild.members.fetch(mentionable);
    if (!targetUser) {
      await interaction.editReply("That user doesn't exist in this server.");
      return;
    }

    if (targetUser.user.bot) {
      await interaction.editReply("I can't timeout a bot.");
      return;
    }

    const msDuration = ms(duration);
    if (isNaN(msDuration)) {
      await interaction.editReply('Please provide a valid timeout duration.');
      return;
    }

    if (msDuration < 5000 || msDuration > 2.419e9) {
      await interaction.editReply('Timeout duration cannot be less than 5 seconds or more than 28 days.');
      return;
    }

    const targetUserRolePosition = targetUser.roles.highest.position; // Highest role of the target user
    const requestUserRolePosition = interaction.member.roles.highest.position; // Highest role of the user running the cmd
    const botRolePosition = interaction.guild.members.me.roles.highest.position; // Highest role of the bot

    if (targetUserRolePosition >= requestUserRolePosition) {
      await interaction.editReply("You can't timeout that user because they have the same/higher role than you.");
      return;
    }

    if (targetUserRolePosition >= botRolePosition) {
      await interaction.editReply("I can't timeout that user because they have the same/higher role than me.");
      return;
    }

    try {
      const { default: prettyMs } = await import('pretty-ms');

      if (targetUser.isCommunicationDisabled()) {
        await targetUser.timeout(msDuration);
        await interaction.editReply(`${targetUser}'s timeout has been updated to ${prettyMs(msDuration, { verbose: true })}`);
        return;
      }

      await targetUser.timeout(msDuration);
      await interaction.editReply(`${targetUser} was timed out for ${prettyMs(msDuration, { verbose: true })}.`);
    } catch (error) {
      console.log(`There was an error when timing out: ${error}`);
    }
  },

  data: new SlashCommandBuilder()
  .setName('timeout')
  .setDescription("Timeout a user.")
  .addMentionableOption(option =>
    option.setName('user')
    .setDescription('The users who you want to timeout')
    .setRequired(true))
    .addStringOption(option => option
      .setName('duration')
      .setDescription('The duration for the timeout 5m, 20s, 1 day')
      .setRequired(true)
    ),
  permissionsRequired: [PermissionFlagsBits.MuteMembers],
  botPermissions: [PermissionFlagsBits.MuteMembers],
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};