const {Client,Interaction,SlashCommandBuilder,PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder,} = require('discord.js');
const Ticket = require("../../models/Ticket");
module.exports = {
    data: new SlashCommandBuilder()
    .setName('ticket-disable')
    .setDescription('Disable the ticket system'),

    run: async ({ interaction, client, handler }) => {
    await interaction.deferReply
     if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) 
     return await interaction.editreply({content: 'Only server admins can run this comamand', ephemeral: true})

     Ticket.deleteMany({Guild: interaction.guild.id}, async (err, data) => {
        await interaction.editReply('Ticket system has been disabled')
     })

    },
    // devOnly: Boolean,
    //testOnly: true,
    // options: Object[],
    // deleted: Boolean,
  };
  