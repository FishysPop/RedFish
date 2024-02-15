const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder ,ComponentType ,PermissionsBitField} = require("discord.js");
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
    if (client.playerType === 'lavalink') return interaction.reply({content: 'Lavalink is not supported yet',ephemeral: true,});
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });
     return;
    }
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({content: 'You are not connected to a voice channel',ephemeral: true,}); 
   
    await interaction.deferReply();


    const name = interaction.options.getString('name'); 
    try {
      let { data } = await axios.get(`https://nl1.api.radio-browser.info/json/stations/byname/${encodeURIComponent(name)}`)
      if (data.length < 1) {
        return await interaction.followUp({ content: `❌ | No radio station was found, A full list can be found [here](https://www.radio-browser.info/search?page=1&hidebroken=true&order=votes&reverse=true)` })}

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
 
          if (!interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.ViewChannel) || !interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.SendMessages)) {
                const embed = new EmbedBuilder()
                    .setColor('#e66229')
                    .setDescription(`**Enqueued: [${name}](${res.track.url}) -** \`LIVE\``)
                    .setFooter({ text: `Media Controls Disabled: Missing Permissions` });
                return interaction.editReply({ embeds: [embed] });
        } else {
              const embed = new EmbedBuilder()
              .setColor('#e66229')
              .setDescription(`**Enqueued: [${name}](${res.track.url}) -** \`LIVE\``)
               return interaction.editReply({ embeds: [embed] });
          }
        } 
          catch (e) {
        // let's return error if something failed
        console.log(`Error with radio `, e)
        return interaction.editReply(`Unable to play ${name} due to an error`);
    }
  }

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
