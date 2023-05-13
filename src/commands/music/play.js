const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Player } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("play a song in a voice channel")
    .addStringOption(option => option
        .setName("name")
        .setDescription("name of the song")
        .setRequired(true)),


  run: async({ interaction, client, handler }) => {
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply('You are not connected to a voice channel!'); // make sure we have a voice channel

    const name = interaction.options.getString('name'); 
    const queue = player.nodes.create(interaction.guild, {
           metadata: {
            channel: interaction.channel,
            client: interaction.guild.members.me,
            requestedBy: interaction.user,
           },
           selfDeaf: true,
           volume: 80,
           leaveOnEmpty: true,
           leaveOnEmptyCooldown: 300000,
          leaveOnEnd: true,
           leaveOnEndCooldown: 300000,
         });
    if (!queue.connection) await queue.connect(interaction.member.voice.channel)

    await interaction.deferReply();
 

    try {
        const { track } = await player.play(channel, name, {
            nodeOptions: {
                // nodeOptions are the options for guild node (aka your queue in simple word)
                metadata: interaction // we can access this metadata object using queue.metadata later on
            }
        });
 
        return interaction.followUp(`**${track.title}** enqueued!`);
    } catch (e) {
        // let's return error if something failed
        return interaction.followUp(`Something went wrong: ${e}`);
    }
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
