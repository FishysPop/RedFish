const { StringSelectMenuBuilder, ActionRowBuilder, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder ,ComponentType ,PermissionsBitField} = require("discord.js");
const { Player, QueryType, useMainPlayer } = require('discord-player');
const User = require("../../models/UserPlayerSettings");
const GuildSettings = require("../../models/GuildSettings");

require("dotenv").config();
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
    const user = await User.findOne({ userId: interaction.user.id });
    const serverSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });

    let playerSettings = {
      volume: serverSettings?.defaultVolume || '30',
      betaPlayer: user?.betaPlayer || false,
      playerMessages: serverSettings?.playerMessages || "default"
    }


    const name = interaction.options.getString('name');

    try {
        let { data } = await axios.get(`https://nl1.api.radio-browser.info/json/stations/byname/${encodeURIComponent(name)}`);

        if (data.length < 1) {
            return interaction.editReply(`❌ | No radio station found for "${name}".  A full list can be found [here](https://www.radio-browser.info/search?page=1&hidebroken=true&order=votes&reverse=true)`);
        }

        if (data.length > 1) {
          console.log(data)
          const stationMap = new Map(); // Store station URLs keyed by a short ID
      
          const options = data.slice(0, 10).map((station, index) => {
              const stationId = `station_${index}`; // Create a short ID
              stationMap.set(stationId, station.url_resolved);  // Store the full URL in the map
      
              let description = Array.isArray(station.tags) ? station.tags.slice(0, 3).join(', ') : (station.tags || "No tags available");
              if (description.length > 100) {
                  description = description.substring(0, 97) + "...";
              }
      
              return {
                  label: `${station.name} - ${station.country}`,
                  value: stationId, // Use the short ID as the value
                  description: description
              };
          });
            const row = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('radio_select')
                .setPlaceholder('Select a radio station')
                .addOptions(options),
            );
            const selectMessage = await interaction.editReply({ content: 'Multiple stations found. Please select one:', components: [row]});


            const filter = i => i.user.id === interaction.user.id;

            try {
                const confirmation = await selectMessage.awaitMessageComponent({ filter, time: 30000, componentType: ComponentType.StringSelect })
               if (confirmation) {
                const selectedValue = options.find(option => option.value === confirmation.values[0])
                confirmation.deferUpdate()
                data[0].url_resolved = selectedValue.value; // Set selected station URL 
                interaction.editReply({components: []})
                } else {
                  interaction.editReply({content: `No station was selected`, components: []}); 
                  return
                }
            } catch (e) {
              interaction.editReply({ content: 'Selection timed out. Please try the command again.', components: [] })
              console.log(e)
              return
            }
        }

    switch (client.playerType) {
      case "both":
        interaction.editReply("Both players not supported yet")
        break;

        case "discord_player":
            const player = useMainPlayer();
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
                    playerMessages: playerSettings.playerMessages
                  },
                  volume: playerSettings.volume,
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
         
 
        break;

        case "lavalink":
          try {
          const player = await client.manager.createPlayer({
            guildId: interaction.guild.id,
            textId: interaction.channel.id,
            voiceId: channel.id,
            volume: playerSettings.volume,
            deaf: true,
            nodeName: `${process.env.NAME}1`,
            data: {
              autoPlay: false,
              playerMessages: playerSettings.playerMessages
            }
        });

        const res = await player.search(data[0].url_resolved, { requester: interaction.user });
        if (!res.tracks.length) return interaction.editReply("No results found!");
        player.queue.add(res.tracks[0]);
        if (!player.playing && !player.paused) player.play();

        if (!interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.ViewChannel) || !interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.SendMessages)) {
          const embed = new EmbedBuilder()
              .setColor('#e66229')
              .setDescription(`**Enqueued: [${name}](${res.tracks[0].uri}) -** \`LIVE\``)
              .setFooter({ text: `Media Controls Disabled: Missing Permissions` });
            return interaction.editReply({ embeds: [embed], components: [], content: ''});
       } else {
             const embed = new EmbedBuilder()
             .setColor('#e66229')
             .setDescription(`**Enqueued: [${name}](${res.tracks[0].uri}) -** \`LIVE\``)
            return interaction.editReply({ embeds: [embed] ,components: [], content: '',
            });
    }
      }
        catch (e) {
          console.log(e)
      return interaction.editReply(`Something went wrong: ${e}`);
        }
        break;
    
      default:
        break;
    }
  } 
  catch (e) {
    console.log(`Error with radio `, 'query: ', name ,'error: ', e)
    return interaction.editReply(`Unable to play ${name} due to an error`);
}

  }

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
