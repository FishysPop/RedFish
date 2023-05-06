const { ApplicationCommandOptionType, Client, Interaction, PermissionFlagsBits } = require('discord.js');
const AutoRole = require('../../models/AutoRole');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
        interaction.reply({
          content: "You can only run this command in a server.",
          ephermeral: true,
        });
        return;
      } 
      await interaction.deferReply();
      if (interaction.options.get('role')?.name === "role" ) {
        const targetRoleId = interaction.options.get('role').value;

        try {
          let autoRole = await AutoRole.findOne({ guildId: interaction.guild.id });
    
          if (autoRole) {
            if (autoRole.roleId === targetRoleId) {
              interaction.editReply('Auto role has already been configured for that role. To disable run `/autorole toggle:False`');
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
          interaction.editReply("Autorole has now been configured. To disable run `/autorole toggle:False`");
          const alreadyset = 'true';
        } catch (error) {
          console.log(error);
        }
    }
    if (interaction.options.get('toggle')?.name === "toggle") {
        try {
            const alreadyset = 'false';
            if (!(await AutoRole.exists({ guildId: interaction.guild.id}))) {
                interaction.editReply('Auto role has not been configured for this server. Use `/autorole role` to set it up.');
                return;
            }

            await AutoRole.findOneAndDelete({ guildId: interaction.guild.id })
            interaction.editReply("Auto role has been disabled")
        } catch (error) {
            console.log(error)
        }

    }

},

  name: 'autorole',
  description: 'Configure your auto-role for this server.',
  options: [
    {
        name: 'role',
        description: 'The role you want users to get on join.',
        type: ApplicationCommandOptionType.Role,
      },
      {
          name: 'toggle',
          description: 'Turns AutoRole Off/On.',
          type: ApplicationCommandOptionType.String,
          choices: [
            {
                name: 'disable',
                value: 'disable',
            }
          ]
        },
  ],
  permissionsRequired: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles],
};