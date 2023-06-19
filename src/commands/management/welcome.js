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
            .setName('type') // 1 is only welcome | 2 is welcome and leaves | 3 is welcome and bans | 4 is welcome leaves and bans
            .setDescription('What messages will be send')
            .addChoices(
				{ name: 'Welcome', value: '1' },
				{ name: 'Welcome and Leave', value: '2' },
                { name: 'Welcome and Ban', value: '3' },
				{ name: 'Welcome, Leave and Ban', value: '4' },
			).setRequired(true))
                   .addStringOption(option => option
                   .setName('welcome-message')
                   .setDescription('(@user) to mention a user, (server) servers name | E.g: (user) has joined (server)'))
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
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            interaction.reply({content: 'Only server admins can run this comamand', ephemeral: true})
            return;
         }    
         if (!interaction.inGuild()) {
            interaction.reply({
              content: "You can only run this command in a server.",
              ephermeral: true,
            });
           return;
          }
     await interaction.deferReply();
     const subcommand = interaction.options.getSubcommand();
     const welcome = await Welcome.findOne({ guildId: interaction.guild.id });
     if (subcommand === 'setup' ) {
        const channel = interaction.options.getChannel('channel')
        const type = interaction.options.getString('type')
        const welcomeMessage = interaction.options.getString('welcome-message') || `Welcome (user) to (server)!`;
        const leaveMessage = interaction.options.getString('leave-message') || '(user) has left (server)!';
        const banMessage = interaction.options.getString('ban-message') || '(user) has been banned from (server)!';
        if (welcome) {
            await interaction.editReply(`Welcome has already been setup welcome messages will be created in ${welcome.channel} too disable run **/welcome disable**`)
            return;
       } else {
        Welcome.create({
         guildId: interaction.guild.id,
         channel: channel,
         type: type,
         welcomeMessage: welcomeMessage,  
         banMessage: banMessage,     
         leaveMessage: leaveMessage,
})
         interaction.editReply("Welcome has been setup.")
       }
     }
     if (subcommand === 'quick-setup' ) {
        const channel = interaction.options.getChannel('channel')
        const type = '2';
        const welcomeMessage = `Welcome (user) to (server)!`;
        const leaveMessage = '(user) has left (server)!';
        const banMessage = '(user) has been banned from (server)!';
        if (welcome) {
            await interaction.editReply(`Welcome has already been setup welcome messages will be created in ${welcome.channel} too disable run **/welcome disable**`)
            return;
       } else {
        Welcome.create({
         guildId: interaction.guild.id,
         channel: channel.id,
         type: type,
         welcomeMessage: welcomeMessage,  
         banMessage: banMessage,     
         leaveMessage: leaveMessage,
})
         interaction.editReply("Welcome has been setup.")
       }
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
  