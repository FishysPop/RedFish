const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder } = require("discord.js");
const { Player } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("play command")
    .addStringOption(option => option
        .setName("song")
        .setDescription("name of the song")
        .setRequired(true)),


  run: async({ interaction, client, handler }) => {
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply('You are not connected to a voice channel!'); // make sure we have a voice channel
    const query = interaction.options.getString('song'); // we need input/query to play
 
    // let's defer the interaction as things can take time to process
    await interaction.deferReply();
 
    try {
        const { track } = await player.play(channel, query, {
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
