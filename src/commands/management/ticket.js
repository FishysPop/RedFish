const {Client,Interaction,SlashCommandBuilder,PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder,} = require('discord.js');
const Ticket = require("../../models/Ticket");
module.exports = {
    data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Setup a ticket system, when a user clicks a button it will create a ticket.')
    .addChannelOption(option => option.setName('channel').setDescription('The channel you want the ticket message to be sent').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addChannelOption(option => option.setName('category').setDescription('The category you want the tickets to be created in.').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('The text of the ticket message.').setRequired(true)),
   
    //3 subcommmands one /ticket setup, /ticket quicksetup, /ticket disable
    //  /ticket setup channel:channel category:category access:role message:string
    //  /ticket setup channel:string
    //  /ticket disable

    run: async ({ interaction, client, handler }) => {
    await interaction.deferReply
    if(!PermissionsBitField.Flags.ManageChannels) return await interaction.editreply({content: 'I do not have manageChannels permission', ephemeral: true})
     if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) 
     return await interaction.editreply({content: 'Only server admins can run this comamand', ephemeral: true})
     const channel = interaction.options.getChannel('channel')
     const category = interaction.options.getChannel('channel')
     const ticketmessage = interaction.options.getString('message')
     Ticket.findOne({Guild: interaction.guild.id})
     if (!Ticket) {
        Ticket.create({
            Guild: interaction.guild.id,
            Category: category.id,
            ticketNumber: '0'
        })
    } else {
        await interaction.reply(`Ticket system has already been setup tickets will be created in ${Ticket.Category} to disable run **/ticket-disable**`)
        return;
    }
     const embed = new EmbedBuilder()
     .setColor("#e66229")
     .setTitle(`${ticketmessage}`)
     .setDescription("Create a ticket by clicking :envelope_with_arrow:")
     const TicketButton = new ButtonBuilder().setCustomId('Ticket').setEmoji(':envelope_with_arrow:').setStyle(ButtonStyle.Primary);
     const row = new ActionRowBuilder()
    .addComponents(TicketButton);
    await channel.send({embed :[embed], components: [row]})
    await interaction.editreply("Ticket System has been setup")
    },
    // devOnly: Boolean,
    //testOnly: true,
    // options: Object[],
    // deleted: Boolean,
  };
  