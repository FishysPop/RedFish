const { SlashCommandBuilder,PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle ,StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags} = require('discord.js');
const User = require("../../models/UserPlayerSettings");
const GuildSettings = require("../../models/GuildSettings");
const axios = require('axios');
require("dotenv").config();



module.exports = {
  data: new SlashCommandBuilder()
  .setName('player-settings')
  .setDescription('Customise the music player to your liking'),


  run: async ({ interaction, client, handler }) => {
    try {
        if (!interaction.inGuild()) {
            interaction.reply({content: "You can only run this command in a server.", flags: MessageFlags.Ephemeral});
           return;
          }   
       await interaction.deferReply({ flags: MessageFlags.Ephemeral });
       const hasVotedInLast12Hrs = client.topgg ? await hasVotedfunction(interaction.user.id) : new Date() 
       const hasAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator); 
       let hasVoted;
       const userId = interaction.user.id;
       let user;
       user = await User.findOne({ userId });
       const lastVote = hasVotedInLast12Hrs ? new Date() : null;
 
       if (!user) {
         user = new User({
           userId: interaction.user.id,
           lastVote: lastVote,
           defaultSearchEngine: "tidal",
           TidalNativePlay: true, 
         });
         await user.save();
         hasVoted = lastVote ? true : false;
       } else {
        if (!hasVotedInLast12Hrs) {
        if (!user.lastVote) { 
          hasVoted = false; 
        } else {
         const lastVote = user.lastVote.toDateString();
         const currentDate = new Date().toDateString();
         const timeDiff = Math.abs(new Date(currentDate) - new Date(lastVote));
         const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
         hasVoted = daysDiff >= 3 ? false : true;
        }} else {
         hasVoted = true;
         user.lastVote = new Date();
         await user.save();
        }
    }
    const capitalizeSearchEngine = (searchEngine) => {
      return { "youtube": "YouTube", "soundcloud": "SoundCloud", "deezer": "Deezer", "tidal": "Tidal" }[searchEngine] || searchEngine.charAt(0).toUpperCase() + searchEngine.slice(1);
    };
    const formatNowPlaying = (searchEngine) => {
      return { "noMessage": "Disabled", "deleteAfter": "Deletes After Song Finishes", "default": "Default" }[searchEngine] || searchEngine.charAt(0).toUpperCase() + searchEngine.slice(1);
    };

    let embed, row, row2, row3, row4, row5, guildSettings;

    const generateUI = async () => {
      row = new ActionRowBuilder();
      row2 = row3 = row4 = row5 = null;
      embed = new EmbedBuilder().setColor("#e66229");

      if (hasVoted) {
        embed.setTitle("Player Settings")
          .setDescription("Welcome to Player Settings! Here, you can customize your music experience.\n\n**Important:** The bot uses the settings of the person who starts the music queue (the first person to use `/play`).")
          .setFooter({ text: "More Settings Coming Soon!" });

        embed.addFields({ name: "User Settings", value: `Spotify Native Play: ${user.SpotifyNativePlay ? "Enabled" : "Disabled"} (Streams from Spotify)\nTidal Native Play: ${user.TidalNativePlay ? "Enabled" : "Disabled"} (Streams from Tidal)\nConverting Links: ${user.convertLinks ? "Enabled" : "Disabled"} (Converts Youtube Links To Another Platform)\nDefault Search engine: ${capitalizeSearchEngine(user.defaultSearchEngine)}` });
        row.addComponents(
          new ButtonBuilder().setCustomId('spotifyNativePlayButton').setLabel(user.SpotifyNativePlay ? "Disable Spotify Native" : "Enable Spotify Native").setStyle(user.SpotifyNativePlay ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId('tidalNativePlayButton').setLabel(user.TidalNativePlay ? "Disable Tidal Native" : "Enable Tidal Native").setStyle(user.TidalNativePlay ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId('convertLinksButton').setLabel(user.convertLinks ? "Disable Converting links" : "Enable Converting links").setStyle(user.convertLinks ? ButtonStyle.Danger : ButtonStyle.Success)
        );

        row2 = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId('defaultSearchEngineSelectMenu').setPlaceholder('Default Search engine.').addOptions(
            new StringSelectMenuOptionBuilder().setLabel('YouTube').setValue('youtube'),
            new StringSelectMenuOptionBuilder().setLabel('Spotify').setValue('spotify'),
            new StringSelectMenuOptionBuilder().setLabel('SoundCloud').setValue('soundcloud'),
            new StringSelectMenuOptionBuilder().setLabel('Deezer').setValue('deezer'),
            new StringSelectMenuOptionBuilder().setLabel('Tidal').setValue('tidal'),
          ).setMaxValues(1)
        );

        if (hasAdmin) {
          guildSettings = await GuildSettings.findOne({ guildId: interaction.guildId }) || await GuildSettings.create({ guildId: interaction.guildId, levels: false, defaultVolume: 30, playerMessages: "default", preferredNode: null });
          if (!guildSettings.defaultVolume) { guildSettings.defaultVolume = 30; await guildSettings.save(); }
          if (!guildSettings.playerMessages) { guildSettings.playerMessages = "default"; await guildSettings.save(); }

          embed.addFields({ name: "Server Settings", value: `Default volume: ${guildSettings.defaultVolume}%\n Now Playing Message: ${formatNowPlaying(guildSettings.playerMessages)}\nPrefered Node: ${guildSettings.preferredNode ? guildSettings.preferredNode : "None"}` });
          row3 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('adminVolumeSelectMenu').setPlaceholder('Server volume.').addOptions(
              { label: '10%', value: '10' }, { label: '20%', value: '20' }, { label: '30%', value: '30' }, { label: '40%', value: '40' }, { label: '50%', value: '50' },
              { label: '60%', value: '60' }, { label: '70%', value: '70' }, { label: '80%', value: '80' }, { label: '90%', value: '90' }, { label: '100%', value: '100' },
              { label: '125% (May Distort Audio)', value: '125' }, { label: '150% (May Distort Audio)', value: '150' }
            ).setMaxValues(1)
          );
          row4 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('adminPlayerMessageSelectMenu').setPlaceholder('Now Playing Message.').addOptions(
              { label: 'Disabled', value: 'noMessage' }, { label: 'Delete After Finish', value: 'deleteAfter' }, { label: 'Default', value: 'default' }
            ).setMaxValues(1)
          );
          const nodesArray = Array.from(client.manager.shoukaku.nodes);
          const preferedNodeSelectMenu = new StringSelectMenuBuilder().setCustomId('preferedNodeSelectMenu').setPlaceholder('Prefered Node');
          for (const node of nodesArray) preferedNodeSelectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel(node[1].name).setValue(node[1].name));
          row5 = new ActionRowBuilder().addComponents(preferedNodeSelectMenu);
        }
      } else {
        embed.setTitle("Player Settings").setDescription("You need to vote to access player settings.");
        row.addComponents(
          new ButtonBuilder().setLabel("Vote").setStyle(ButtonStyle.Link).setURL("https://top.gg/bot/1105149646612987934/"),
          new ButtonBuilder().setCustomId("reloadButton").setLabel("🔄").setStyle(ButtonStyle.Primary)
        );
      }
    };

    await generateUI();
    const message = await interaction.editReply({
      embeds: [embed],
      components: [row, row2, row3, row4, row5].filter(Boolean),
      withResponse: true,
      flags: MessageFlags.Ephemeral
    });

      const collector = message.createMessageComponentCollector({
        idle: 60000,
      });
  
      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) return i.reply({content: "This is not your settings", flags: MessageFlags.Ephemeral});
        i.deferUpdate();

        if (i.customId === "reloadButton") {
          const voted = client.topgg ? await hasVotedfunction(interaction.user.id) : true;
          if (voted) {
            hasVoted = true;
            user.lastVote = new Date();
            await user.save();
            await generateUI();
            return interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true, flags: MessageFlags.Ephemeral});
          } else {
            return i.followUp({ content: "You haven't voted yet! If you just voted, wait a few seconds and try again.", flags: MessageFlags.Ephemeral });
          }
        }

        switch (i.customId) {
          case "spotifyNativePlayButton":
            user.SpotifyNativePlay = !user.SpotifyNativePlay;
            await user.save();
            await generateUI();
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true, flags: MessageFlags.Ephemeral });
          break;
          case "tidalNativePlayButton":
            user.TidalNativePlay = !user.TidalNativePlay;
            await user.save();
            await generateUI();
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true, flags: MessageFlags.Ephemeral });
          break;
          case "convertLinksButton":
            user.convertLinks = !user.convertLinks;
            await user.save();
            await generateUI();
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true, flags: MessageFlags.Ephemeral });
            break;
          case "adminVolumeSelectMenu":
            guildSettings.defaultVolume = i.values[0]
            await guildSettings.save()
            await generateUI();
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true, flags: MessageFlags.Ephemeral })
          break;
          case "defaultSearchEngineSelectMenu":
            user.defaultSearchEngine = i.values[0];
            await user.save();
            await generateUI();
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true, flags: MessageFlags.Ephemeral })
          break;
          case "adminPlayerMessageSelectMenu":
            guildSettings.playerMessages = i.values[0];
            await guildSettings.save();
            await generateUI();
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true, flags: MessageFlags.Ephemeral })
          break;
          case "preferedNodeSelectMenu":
            guildSettings.preferredNode = i.values[0];
            await guildSettings.save();
            await generateUI();
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true, flags: MessageFlags.Ephemeral })
          break;
        }
      });

      collector.on("end", () => {
        interaction.editReply({ components: [], flags: MessageFlags.Ephemeral});
      });
          
  } catch (error) {
   console.log("error while running playerSettings",error)   
   interaction.editReply("Seems something went wrong, please try again later").catch(null)
  }

  async function hasVotedfunction(id) {
    if (!id) throw new Error("Missing ID");
  
    const httpsAgent = new (require('https').Agent)({
      family: 4,
      rejectUnauthorized: false
    });
  
    const maxRetries = 5;
    let attempt = 0;
  
    while (attempt < maxRetries) {
      try {
        const response = await axios({
          method: 'GET',
          url: `https://top.gg/api/bots/${client.id}/check`,
          params: { userId: id },
          headers: {
            'Authorization': process.env.TOP_GG
          },
          httpsAgent
        });
  
        return !!response.data.voted;
      } catch (error) {
        // If it's a 404 error with "User not found" message, treat as not voted
        if (error.response && error.response.status === 404 &&
            error.response.data && error.response.data.message === 'User not found.') {
          return false;
        }
        
        attempt++;
        console.error(`Error checking vote status (Attempt ${attempt} of ${maxRetries}):`, error);
  
        if (attempt >= maxRetries) {
          throw new Error("Failed to check vote status after multiple attempts");
        }
      }
    }
  }
  },
  // devOnly: Boolean,
  //testOnly: true,
  //deleted: true,
};
