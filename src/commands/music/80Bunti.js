const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Player, QueryType } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("80bunti")
    .setDescription("Plays 80bunti by beastyqt"),



  run: async({ interaction, client, handler }) => {
    await interaction.deferReply();
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.editReply('You are not connected to a voice channel!'); // make sure we have a voice channel

    const name = "https://music.youtube.com/watch?v=4T53XltHrcU&feature=share";
    const searchResult = await player.search(name, {
        requestedBy: interaction.user,
        requestedByUsername: interaction.user.username
      });
      if (!searchResult.hasTracks()) {
        return interaction.followUp(`We found no tracks for ${query}!`);
      }
    try {
        const res = await player.play(
            interaction.member.voice.channel.id,
            searchResult,
            {
              nodeOptions: {
                metadata: {
                  channel: interaction.channel,
                  client: interaction.guild.members.me,
                  requestedBy: interaction.user,
                },
                bufferingTimeout: 15000,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 300000,
                skipOnNoStream: true,
              },
            }
          );
 
          const message = res.track.playlist
          ? `Successfully enqueued **track(s)** from: **${res.track.playlist.title}**`
          : `Successfully enqueued: **${res.track.author} - ${res.track.title}**`; 
          return interaction.editReply({ content: message });
        } 
          catch (e) {
        // let's return error if something failed
        return interaction.editReply(`Something went wrong: ${e}`);
    }
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
