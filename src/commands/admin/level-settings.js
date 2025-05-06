const {Client,Interaction,SlashCommandBuilder,PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags} = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level-setting')
        .setDescription('Enable or disable levels.')
        .addStringOption(option => option
            .setName('choice')
            .setDescription('The state you want levels to be in')
            .setRequired(true)
            .addChoices(
                { name: 'Enable', value: 'enable' },
                { name: 'Disable', value: 'disable' },
            )),


        run: async ({ interaction, client, handler }) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          interaction.reply({content: 'Only server admins can run this comamand', flags: MessageFlags.Ephemeral})
          return;
       }    
       await interaction.deferReply();


        const choice = interaction.options.getString('choice');

        if (choice === 'enable') {
            try {
                const guildSettings = await GuildSettings.findOneAndUpdate({ guildId: interaction.guildId }, { $set: { levels: true } });
                if (guildSettings) {
                    await interaction.followUp({ content: 'Levels have been enabled.' });
                } else {
                    await GuildSettings.create({ guildId: interaction.guildId, levels: true });
                    await interaction.followUp({ content: 'Levels have been enabled for this server.' });
                }
            } catch (error) {
                console.error(error);
                await interaction.followUp({ content: 'An error occurred while enabling levels.' });
            }
        } else if (choice === 'disable') {
            try {
                const guildSettings = await GuildSettings.findOneAndUpdate({ guildId: interaction.guildId }, { $set: { levels: false } });
                if (guildSettings) {
                    await interaction.followUp({ content: 'Levels have been disabled.' });
                } else {
                    await GuildSettings.create({ guildId: interaction.guildId, levels: false });
                    await interaction.followUp({ content: 'Levels have been disabled for this server.' });
                }
            } catch (error) {
                console.error(error);
                await interaction.followUp({ content: 'An error occurred while disabling levels.' });
            }
        } 
    },
};
