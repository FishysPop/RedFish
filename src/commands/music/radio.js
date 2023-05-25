const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder ,ComponentType} = require("discord.js");
const { Player, QueryType } = require('discord-player');
const axios = require('axios')
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("radio")
    .setDescription("play a radio station  in a voice channel")
    .addStringOption(option => option
        .setName("name")
        .setDescription("name of the station")
        .setRequired(true)),


  run: async({ interaction, client, handler }) => {
    await interaction.deferReply();
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({content: 'You are not connected to a voice channel',ephemeral: true,}); 

    const name = interaction.options.getString('name'); 
    try {
      let { data } = await axios.get(`https://nl1.api.radio-browser.info/json/stations/byname/${encodeURIComponent(name)}`)
      if (data.length < 1) {
        return await interaction.followUp({ content: `❌ | No radio station was found` })}

      const searchResult = await player.search(data[0].url_resolved, {
        requestedBy: interaction.user,
      });

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
                connectionTimeout: 999_999_999
              },
            }
          );
 
          const message = res.track.playlist
          ? `Successfully enqueued **track(s)** from: **${res.track.playlist.title}**`
          : `Successfully enqueued: **${name}**`; 
          return interaction.editReply({ content: message });
        } 
          catch (e) {
        // let's return error if something failed
        console.log(`Error with radio ${e}`)
        return interaction.editReply(`Unable to play ${name} due to an error`);
    }
  }

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
