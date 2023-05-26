const {Client,Interaction,SlashCommandBuilder,PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const Ticket = require("../../models/Ticket");
module.exports = {
    data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Setup a ticket system, when a user clicks a button it will create a ticket')
    .addSubcommand((subcommand) => subcommand.setName("setup").setDescription("Disables auto role")
    .addChannelOption(option => option
        .setName('channel')
        .setDescription('The channel you want the ticket message to be sent')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addChannelOption(option => option
            .setName('category')
            .setDescription('The category you want the tickets to be created in.')
            .addChannelTypes(ChannelType.GuildCategory).setRequired(true))
                .addRoleOption((option) => option
                .setName('access-role')
                .setDescription('The role staff need to access ticket channels').setRequired(true))
                   .addStringOption(option => option
                   .setName('message')
                   .setDescription('The title of the ticket message.').setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName("quick-setup").setDescription("Disables auto role")
    .addChannelOption(option => option
        .setName('channel')
        .setDescription('The channel you want the ticket message to be sent')
        .addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disables auto role")),
   
    //3 subcommmands one /ticket setup, /ticket quicksetup, /ticket disable
    //  /ticket setup channel:channel category:category access:role message:string
    //  /ticket setup channel:string
    //  /ticket disable

    run: async ({ interaction, client, handler }) => {
     await interaction.deferReply();

    if(!PermissionsBitField.Flags.ManageChannels) return await interaction.editreply({content: 'I do not have manageChannels permission', ephemeral: true})
     if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.editreply({content: 'Only server admins can run this comamand', ephemeral: true})
     const subcommand = interaction.options.getSubcommand();
     const ticket = await Ticket.findOne({ guildId: interaction.guild.id });
     if (subcommand === 'setup' ) {
        const channel = interaction.options.getChannel('channel')
        const category = interaction.options.getChannel('category')
        const accessRole = interaction.options.getRole('access-role')
        const ticketmessage = interaction.options.getString('message')
        
        if (ticket) {
            await interaction.editReply(`Ticket system has already been setup tickets will be created in ${Ticket.Category} to disable run **/ticket disable**`)
            return;
       } else {
        Ticket.create({
            guildId: interaction.guild.id,
            category: category.id,
            ticketNumber: '0',
            role: accessRole.id
        })
       }
        const ticketEmebed = await new EmbedBuilder()
        .setColor("#e66229")
        .setTitle(`${ticketmessage}`)
        .setDescription("Create a ticket by clicking :envelope_with_arrow:")
        const TicketButton = new ButtonBuilder().setCustomId('Ticket').setEmoji('<:w_ticketicon:1111489547268796497').setStyle(ButtonStyle.Secondary);
        const row = new ActionRowBuilder()
       .addComponents(TicketButton);
       await channel.send({ embeds: [ticketEmebed] ,components: [row]})
       await interaction.editReply("Ticket System has been setup")
       



     }
     if (subcommand === 'quick-setup' ) {
        const channel = interaction.options.getChannel('channel')

        if (ticket) {
            await interaction.editReply(`Ticket system has already been setup tickets will be created in ${Ticket.category} to disable run **/ticket disable**`)
            return;
       } else {
        const createdRole = await interaction.guild.roles.create({
             name: 'Ticket Staff'});

        const createdCategory = await interaction.guild.channels.create({
            name: 'Tickets',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: createdRole.id,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                },

            ],
        });
        await Ticket.create({
            guildId: interaction.guild.id,
            category: createdCategory.id,
            ticketNumber: '1',
            role: createdRole.id
        })

        const ticketEmebed = await new EmbedBuilder()
        .setColor("#e66229")
        .setTitle(`Support Ticket`)
        .setDescription("Create a ticket by clicking :envelope_with_arrow:")
        const TicketButton = new ButtonBuilder().setCustomId('Ticket').setEmoji('<:w_ticketicon:1111489547268796497').setStyle(ButtonStyle.Secondary);
        const row = new ActionRowBuilder()
       .addComponents(TicketButton);
       await channel.send({ embeds: [ticketEmebed] ,components: [row]})
       await interaction.editReply(`Ticket System has been setup, ticket will be created in ${createdCategory} Category and staff will be able to access tickets with the ${createdRole} role`)
       }
     }
     if (subcommand === 'disable' ) {
        if (!(await Ticket.exists({ guildId: interaction.guild.id}))) {
            interaction.editReply('Tickets have not been setup yet, Use  **/ticket setup** or **/ticket quick-setup** to set it up.');
            return;
        }

        await Ticket.findOneAndDelete({ guildId: interaction.guild.id })
        interaction.editReply("Ticket has been disabled")

     }

    },
    // devOnly: Boolean,
    //testOnly: true,
    // options: Object[],
    // deleted: Boolean,
  };
  