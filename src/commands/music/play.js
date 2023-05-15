const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Player, QueryType } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("play a song in a voice channel")
    .addStringOption(option => option
        .setName("name")
        .setDescription("name of the song")
        .setRequired(true)),


  run: async({ interaction, client, handler }) => {
    await interaction.deferReply();
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.editReply('You are not connected to a voice channel!'); // make sure we have a voice channel

    const name = interaction.options.getString('name'); 

    try {
        const { track } = await player.play(channel, name, {
            nodeOptions: {
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild?.members.me,
                    requestedBy: interaction.user.username,
                    discriminator: interaction.user.discriminator
                },
                volume: 30,
                bufferingTimeout: 5000,
            leaveOnEnd: "false" ? false : true
              },
            
        })
 
        return interaction.editReply(`**${track.title}** enqueued!`);
    } catch (e) {
        // let's return error if something failed
        return interaction.editReply(`Something went wrong: ${e}`);
    }
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
