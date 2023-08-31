const {Client,Interaction,SlashCommandBuilder,PermissionsBitField, ChannelType , EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildChannelManager} = require('discord.js');
const AutoRoom = require("../../models/AutoRoom");
module.exports = {
    data: new SlashCommandBuilder()
    .setName('autoroom')
    .setDescription('Setup a ticket system, when a user clicks a button it will create a ticket')
    .addSubcommand((subcommand) => subcommand.setName("setup").setDescription("quicksetup but with more options")
    .addStringOption(option => option
        .setName('source')
        .setDescription('Name of the channel people join to create there voice channel').setRequired(true))
           .addStringOption(option => option
               .setName('name-of-autoroom')
               .setDescription(`ect: (user)'s room  | (user) playing (game) | game = current status`).setRequired(true))
                   .addChannelOption(option => option
                       .setName('category')
                       .setDescription('The category you want the autorooms to be created in.')
                       .addChannelTypes(ChannelType.GuildCategory).setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName("quick-setup").setDescription("An easy setup"))
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disables autorooms (Does not delete channels)")),

    run: async ({ interaction, client, handler }) => {
     await interaction.deferReply();

    if(!PermissionsBitField.Flags.ManageChannels) return await interaction.editreply({content: 'I do not have manageChannels permission', ephemeral: true})
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        interaction.editReply({content: 'Only server admins can run this comamand', ephemeral: true})
        return;
     }    
     if (!interaction.inGuild()) {
        interaction.editReply({
          content: "You can only run this command in a server.",
          ephemeral: true,
        });
       return;
      }
     const subcommand = interaction.options.getSubcommand();
     const autoroom = await AutoRoom.findOne({ guildId: interaction.guild.id });
     if (subcommand === 'setup' ) {
        const channelName = interaction.options.getString('name-of-autoroom')
        const source = interaction.options.getString('source')
        const category = interaction.options.getChannel('category')        
        if (autoroom) {
            await interaction.editReply(`AutoRooms have already been setup autorooms will be created in ${autoroom.category} to disable run **/autoroom disable**`)
            return;
       } else {
        const voiceChannel = await interaction.guild.channels.create({
            name: source,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                  },
            ],
        });

        AutoRoom.create({
            guildId: interaction.guild.id,
            category: category.id,
            source: voiceChannel.id,
            channelName: channelName
        })
        interaction.editReply(`AutoRooms have been setup, new autorooms will be created in ${category}, Users who join ${voiceChannel} will have there voice channel created.`)

       }




     }
     if (subcommand === 'quick-setup' ) {
        const channel = interaction.options.getChannel('channel')

        if (autoroom) {
            await interaction.editReply(`Ticket system has already been setup tickets will be created in ${Ticket.category} to disable run **/ticket disable**`)
            return;
       } else {
        const createdCategory = await interaction.guild.channels.create({
            name: 'AutoRooms',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                },
            ],
        });
        const voiceChannel = await interaction.guild.channels.create('Voice Channel', {
            type: ChannelType.GuildVoice,
            parent: createdCategory.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    allow: [PermissionsBitField.FLAGS.VIEW_CHANNEL],
                },
            ],
        });
        await AutoRoom.create({
            guildId: interaction.guild.id,
            category: createdCategory.id,
            source: '0',
            channelName: accessRole.id
        })
       }
     }
     if (subcommand === 'disable' ) {
        if (!(await AutoRoom.exists({ guildId: interaction.guild.id}))) {
            interaction.editReply('AutoRooms have not been setup yet, Use  **/ticket setup** or **/ticket quick-setup** to set it up.');
            return;
        }

        await AutoRoom.findOneAndDelete({ guildId: interaction.guild.id })
        interaction.editReply("AutoRoom has been disabled")

     }

    },
    // devOnly: Boolean,
    //testOnly: true,
    // options: Object[],
    // deleted: Boolean,
  };
  