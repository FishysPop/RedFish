const {Client,Interaction,SlashCommandBuilder,PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const Welcome = require("../../models/Welcome");
module.exports = {
    data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Welcome people in a channel when they join the server.')
    .addSubcommand((subcommand) => subcommand.setName("setup").setDescription("More customisation than quicksetup with support for messages for bans and leaves")
    .addChannelOption(option => option
        .setName('channel')
        .setDescription('The channel you want the welcome messages to be sent in.')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption(option => option
            .setName('type')
            .setDescription('What messages will be send')
            .addChoices(
				{ name: 'Welcome', value: 'welcome' },
				{ name: 'Welcome and Leave', value: 'welcomeLeave' },
                { name: 'Welcome and Ban', value: 'welcomeBan' },
				{ name: 'Welcome, Leave and Ban', value: 'welcomeLeaveBan' },
			).setRequired(true))
                   .addStringOption(option => option
                   .setName('welcome-message')
                   .setDescription('The message that is send when a user joins.').setRequired(true))
                      .addStringOption(option => option
                      .setName('leave-message')
                      .setDescription('The message that is send when a user leaves.'))
                         .addStringOption(option => option
                         .setName('ban-message')
                         .setDescription('The message that is send when a user is banned.')))
    .addSubcommand((subcommand) => subcommand.setName("quick-setup").setDescription("Welcomes users when they join the server")
    .addChannelOption(option => option
        .setName('channel')
        .setDescription('The channel you want the welcome messages to be sent in')
        .addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disables welcome messsages")),
   

    run: async ({ interaction, client, handler }) => {
     await interaction.deferReply();
     if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.editreply({content: 'Only server admins can run this comamand', ephemeral: true})
     const subcommand = interaction.options.getSubcommand();
     const welcome = await Welcome.findOne({ guildId: interaction.guild.id });
     if (subcommand === 'setup' ) {
 
     }
     if (subcommand === 'quick-setup' ) {
 
     }
     if (subcommand === 'disable' ) {
        if (!(await Welcome.exists({ guildId: interaction.guild.id}))) {
            interaction.editReply('Welcome have not been setup yet, Use  **/welcome setup** or **/welcome quick-setup** to set it up.');
            return;
        }

        await Welcome.findOneAndDelete({ guildId: interaction.guild.id })
        interaction.editReply("Welcome has been disabled")

     }

    },
    // devOnly: Boolean,
    //testOnly: true,
    // options: Object[],
    // deleted: Boolean,
  };
  