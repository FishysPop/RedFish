const { ApplicationCommandOptionType, Client, Interaction, PermissionFlagsBits , SlashCommandBuilder,PermissionsBitField, MessageFlags} = require('discord.js');
const AutoRole = require('../../models/AutoRole');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('When a user joins they will be given a role.')
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disables auto role"))
    .addSubcommand((subcommand) => subcommand.setName("role").setDescription("The role users will be given on join").addRoleOption((option) => option
    .setName('role').setDescription('The role you want users to receive on joining').setRequired(true))),

    
  run: async ({client, interaction})  => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      interaction.reply({content: 'Only server admins can run this comamand', flags: MessageFlags.Ephemeral})
      return;
   }    
    const subcommand = interaction.options.getSubcommand();
    
    if (!interaction.inGuild()) {
        interaction.reply({
          content: "You can only run this command in a server.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      } 
      if (subcommand === 'role' ) {
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
          interaction.reply({content: 'Hey there... This feature requires me to have Manage Roles Permissions, Since autoroles give the user a role when they join.', flags: MessageFlags.Ephemeral})
          return;
       }    
        const targetRoleId = interaction.options.get('role').value;
        const targetRole = interaction.guild.roles.cache.get(targetRoleId)

        try {
          let autoRole = await AutoRole.findOne({ guildId: interaction.guild.id });
          
          if (autoRole) {
            if (autoRole.roleId === targetRoleId) {
              interaction.reply('Autorole has already been configured for that role. To disable run `/autorole disable`');
              return;
            }
          } else {
            autoRole = new AutoRole({
              guildId: interaction.guild.id,
              roleId: targetRoleId,
            });
          }
    
          await autoRole.save();
          const targetRolePosition = targetRole.position;
          const botRolePosition = interaction.guild.members.me.roles.highest.position; 

          if (targetRolePosition >= botRolePosition) {
            interaction.reply(`Autorole has been enabled but you need to move the bots role above ${targetRole} for it to work. To disable run \`/autorole disable\``);
            return;
          }
          if (autoRole) {
            interaction.reply(`Autorole has been updated to ${targetRole}. To disable run \`/autorole disable\``);
            autoRole.roleId = targetRoleId
            await autoRole.save();
            return;
          } else {
            interaction.reply(`Autorole has now been configured for ${targetRole}. To disable run \`/autorole disable\``);
          }
        } catch (error) {
          console.log(error);
        }
    }
    if (subcommand === 'disable') {
        try {
            if (!(await AutoRole.exists({ guildId: interaction.guild.id}))) {
                interaction.reply('Auto role has not been configured for this server. Use `/autorole role` to set it up.');
                return;
            }

            await AutoRole.findOneAndDelete({ guildId: interaction.guild.id })
            interaction.reply("Auto role has been disabled")
        } catch (error) {
            console.log(error)
        }

    }
},
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};