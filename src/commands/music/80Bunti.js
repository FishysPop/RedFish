const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder } = require("discord.js");
const { Player } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("80bunti")
    .setDescription("Plays 80 Bunti by beastyqt"),


  run: async({ interaction, client, handler }) => {
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply('You are not connected to a voice channel!'); // make sure we have a voice channel
    const query = 'https://music.youtube.com/watch?v=4T53XltHrcU&feature=share'
 
    // let's defer the interaction as things can take time to process
    await interaction.deferReply();
 
    try {
        const { track } = await player.play(channel, query, {
            nodeOptions: {
                // nodeOptions are the options for guild node (aka your queue in simple word)
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild?.members.me,
                    requestedBy: interaction.user.username,
                    discriminator: interaction.user.discriminator
                },// we can access this metadata object using queue.metadata later on
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
