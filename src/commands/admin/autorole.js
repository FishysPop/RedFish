const { ApplicationCommandOptionType, Client, Interaction, PermissionFlagsBits , SlashCommandBuilder,PermissionsBitField} = require('discord.js');
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
      interaction.reply({content: 'Only server admins can run this comamand', ephemeral: true})
      return;
   }    
    const subcommand = interaction.options.getSubcommand();
    
    if (!interaction.inGuild()) {
        interaction.reply({
          content: "You can only run this command in a server.",
          ephemeral: true,
        });
        return;
      } 
      if (subcommand === 'role' ) {
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
          interaction.reply({content: 'Hey there... This feature requires me to have Manage Roles Permissions, Since autoroles give the user a role when they join.', ephemeral: true})
          return;
       }    
        const targetRoleId = interaction.options.get('role').value;

        try {
          let autoRole = await AutoRole.findOne({ guildId: interaction.guild.id });
    
          if (autoRole) {
            if (autoRole.roleId === targetRoleId) {
              interaction.reply('Auto role has already been configured for that role. To disable run `/autorole disable');
              return;
            }
    
            autoRole.roleId = targetRoleId;
          } else {
            autoRole = new AutoRole({
              guildId: interaction.guild.id,
              roleId: targetRoleId,
            });
          }
    
          await autoRole.save();
          interaction.reply("Autorole has now been configured. To disable run `/autorole toggle:False`");
          const alreadyset = 'true';
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