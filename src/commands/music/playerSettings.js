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
       await interaction.deferReply();
       const hasVotedInLast12Hrs = client.topgg ? await hasVotedfunction(interaction.user.id) : new Date() 
       const hasAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator); 
       let hasVoted;
       const userId = interaction.user.id;
       let user;
       user = await User.findOne({ userId });
       const lastVote = hasVotedInLast12Hrs ? new Date() : null;
 
       // Check if the user exists in the database
       if (!user) {
         user = new User({
           userId: interaction.user.id,
           lastVote: lastVote,
           defaultSearchEngine: "spotify",
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
    let row = new ActionRowBuilder()
    let row2 = null;
    let row3 = null;
    let row4 = null;
    let row5 = null;
    let guildSettings;
    function capitalizeSearchEngine(searchEngine) {
      return {
        "youtube": "YouTube",
        "soundcloud": "SoundCloud",
        "deezer": "Deezer",
      }[searchEngine] || searchEngine.charAt(0).toUpperCase() + searchEngine.slice(1);
    }
    function formatNowPlaying(searchEngine) {
      return {
        "noMessage": "Disabled",
        "deleteAfter": "Deletes After Song Finishes",
        "default": "Default",
      }[searchEngine] || searchEngine.charAt(0).toUpperCase() + searchEngine.slice(1);
    }
    if (hasVoted) {
      const embed = new EmbedBuilder()
        .setTitle("Player Settings")
        .setDescription("Welcome to Player Settings! Here, you can customize your music experience.\n\n**Important:** The bot uses the settings of the person who starts the music queue (the first person to use `/play`).")
        .setColor("#e66229")
        .setFooter({ text : "More Settings Coming Soon!"}); 

      if (hasVoted) {
        embed.addFields({ name: "User Settings", value: `Spotify Native Play: ${ user.SpotifyNativePlay ? "Enabled" : "Disabled" } (Streams from Spotify)\nConverting Links: ${ user.convertLinks ? "Enabled" : "Disabled" } (Converts Youtube Links To Another Platform)\nDefault Search engine: ${capitalizeSearchEngine(user.defaultSearchEngine)}`});
        const spotifyNativePlayButton = new ButtonBuilder().setCustomId('spotifyNativePlayButton').setLabel(user.SpotifyNativePlay ? "Disable Spotify Native" : "Enable Spotify Native").setStyle(user.SpotifyNativePlay ? ButtonStyle.Danger : ButtonStyle.Success);
        const convertLinksButton = new ButtonBuilder().setCustomId('convertLinksButton').setLabel(user.convertLinks ? "Disable Converting links" : "Enable Converting links").setStyle(user.convertLinks ? ButtonStyle.Danger : ButtonStyle.Success);
        row.addComponents(spotifyNativePlayButton, convertLinksButton);
        const defaultSearchEngineSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('defaultSearchEngineSelectMenu')
        .setPlaceholder('Default Search engine.')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('YouTube')
            .setValue('youtube'),
            new StringSelectMenuOptionBuilder()
            .setLabel('Spotify')
            .setValue('spotify'),
            new StringSelectMenuOptionBuilder()
            .setLabel('SoundCloud')
            .setValue('soundcloud'),
            new StringSelectMenuOptionBuilder()
            .setLabel('Deezer')
            .setValue('deezer'),
        )
        .setMaxValues(1);
        row2 = new ActionRowBuilder().addComponents(defaultSearchEngineSelectMenu);
      }
      if (hasAdmin) {
        guildSettings = await GuildSettings.findOne({ guildId: interaction.guildId });
        if (!guildSettings) {
          guildSettings = await GuildSettings.create({ guildId: interaction.guildId, levels: false, defaultVolume: 30 , playerMessages: "default", preferredNode: null });
        } else {
          if (!guildSettings.defaultVolume) {
            guildSettings.defaultVolume = 30;
            await guildSettings.save();
          }
          if (!guildSettings.playerMessages) {
            guildSettings.playerMessages = "default";
            await guildSettings.save();
          }
        }
        embed.addFields({ name: "Server Settings", value: `Default volume: ${guildSettings.defaultVolume}%\n Now Playing Message: ${formatNowPlaying(guildSettings.playerMessages)}\nPrefered Node: ${guildSettings.preferredNode ? guildSettings.preferredNode : "None"}`});
        const adminVolumeSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('adminVolumeSelectMenu')
        .setPlaceholder('Server volume.')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('10%')
            .setValue('10'),
            new StringSelectMenuOptionBuilder()
            .setLabel('20%')
            .setValue('20'),
            new StringSelectMenuOptionBuilder()
            .setLabel('30%')
            .setValue('30'),
            new StringSelectMenuOptionBuilder()
            .setLabel('40%')
            .setValue('40'),
            new StringSelectMenuOptionBuilder()
            .setLabel('50%')
            .setValue('50'),
            new StringSelectMenuOptionBuilder()
            .setLabel('60%')
            .setValue('60'),
            new StringSelectMenuOptionBuilder()
            .setLabel('70%')
            .setValue('70'),
            new StringSelectMenuOptionBuilder()
            .setLabel('80%')
            .setValue('80'),
            new StringSelectMenuOptionBuilder()
            .setLabel('90%')
            .setValue('90'),
            new StringSelectMenuOptionBuilder()
            .setLabel('100%')
            .setValue('100'),
            new StringSelectMenuOptionBuilder()
            .setLabel('125% (May Distort Audio)')
            .setValue('125'),
            new StringSelectMenuOptionBuilder()
            .setLabel('150% (May Distort Audio)')
            .setValue('150'),
        )
        .setMaxValues(1);
         row3 = new ActionRowBuilder().addComponents(adminVolumeSelectMenu);
         const adminPlayerMessageSelectMenu = new StringSelectMenuBuilder()
         .setCustomId('adminPlayerMessageSelectMenu')
         .setPlaceholder('Now Playing Message.')
         .addOptions(
           new StringSelectMenuOptionBuilder()
             .setLabel('Disabled')
             .setValue('noMessage'),
             new StringSelectMenuOptionBuilder()
             .setLabel('Delete After Finish')
             .setValue('deleteAfter'),
             new StringSelectMenuOptionBuilder()
             .setLabel('Default')
             .setValue('default'),
         )
         .setMaxValues(1);
         const nodes = client.manager.shoukaku.nodes;
         const nodesArray = Array.from(nodes);

         const preferedNodeSelectMenu = new StringSelectMenuBuilder()
           .setCustomId('preferedNodeSelectMenu')
           .setPlaceholder('Prefered Node');
   
         for (const node of nodesArray) {
           preferedNodeSelectMenu.addOptions(
             new StringSelectMenuOptionBuilder()
               .setLabel(node[1].name) 
               .setValue(node[1].name)   
           );
         }
         row5 = new ActionRowBuilder().addComponents(preferedNodeSelectMenu);
   
          row4 = new ActionRowBuilder().addComponents(adminPlayerMessageSelectMenu);
      }
      const message = await interaction.editReply({ 
        embeds: [embed], 
        components: [row, row2, row3, row4, row5].filter(Boolean), 
        withResponse: true 
      });
      const collector = message.createMessageComponentCollector({
        idle: 60000,
      });
  
      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) return i.reply({content: "This is not your settings", flags: MessageFlags.Ephemeral});
        i.deferUpdate();

        switch (i.customId) {
          case "spotifyNativePlayButton":
            user.SpotifyNativePlay = !user.SpotifyNativePlay;
            await user.save();
            embed.data.fields[0].value = `Spotify Native Play: ${ user.SpotifyNativePlay ? "Enabled" : "Disabled" } (Streams from Spotify)\nConverting Links: ${ user.convertLinks ? "Enabled" : "Disabled" } (Converts Youtube Links To Another Platform)\nDefault Search engine: ${capitalizeSearchEngine(user.defaultSearchEngine)}`;
            row.components[0].setLabel(user.SpotifyNativePlay ? "Disable Spotify Native" : "Enable Spotify Native").setStyle(user.SpotifyNativePlay ? ButtonStyle.Danger : ButtonStyle.Success);
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true });
          break;
          case "convertLinksButton":
            user.convertLinks = !user.convertLinks;
            await user.save();
            embed.data.fields[0].value = `Spotify Native Play: ${ user.SpotifyNativePlay ? "Enabled" : "Disabled" } (Streams from Spotify)\nConverting Links: ${ user.convertLinks ? "Enabled" : "Disabled" } (Converts Youtube Links To Another Platform)\nDefault Search engine: ${capitalizeSearchEngine(user.defaultSearchEngine)}`;
            row.components[1].setLabel(user.convertLinks ? "Disable Converting links" : "Enable Converting links").setStyle(user.convertLinks ? ButtonStyle.Danger : ButtonStyle.Success);
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true });
            break;
          case "adminVolumeSelectMenu":
            guildSettings.defaultVolume = i.values[0]
            await guildSettings.save()
            embed.data.fields[1].value = `Default volume: ${guildSettings.defaultVolume}%\n Now Playing Message: ${formatNowPlaying(guildSettings.playerMessages)}\nPrefered Node: ${guildSettings.preferredNode ? guildSettings.preferredNode : "None"}`;
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true })
          break;
          case "defaultSearchEngineSelectMenu":
            user.defaultSearchEngine = i.values[0];
            await user.save();
            embed.data.fields[0].value = `Spotify Native Play: ${ user.SpotifyNativePlay ? "Enabled" : "Disabled" } (Streams from Spotify)\nConverting Links: ${ user.convertLinks ? "Enabled" : "Disabled" } (Converts Youtube Links To Another Platform)\nDefault Search engine: ${capitalizeSearchEngine(user.defaultSearchEngine)}`;
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true })
          break;
          case "adminPlayerMessageSelectMenu":
            guildSettings.playerMessages = i.values[0];
            await guildSettings.save();
            embed.data.fields[1].value = `Default volume: ${guildSettings.defaultVolume}%\n Now Playing Message: ${formatNowPlaying(guildSettings.playerMessages)}\nPrefered Node: ${guildSettings.preferredNode ? guildSettings.preferredNode : "None"}`;
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true })
          break;
          case "preferedNodeSelectMenu":
            guildSettings.preferredNode = i.values[0];
            await guildSettings.save();
            embed.data.fields[1].value = `Default volume: ${guildSettings.defaultVolume}%\n Now Playing Message: ${formatNowPlaying(guildSettings.playerMessages)}\nPrefered Node: ${guildSettings.preferredNode ? guildSettings.preferredNode : "None"}`;
            interaction.editReply({ embeds: [embed], components: [row, row2, row3, row4, row5].filter(Boolean), withResponse: true })
          break;
        }
      })
      collector.on("end", () => {
        interaction.editReply({
          components: [],
        });
      });

    } else {
      const embed = new EmbedBuilder()
        .setTitle("Player Settings")
        .setDescription("You need to vote to access player settings.")
        .setColor("#e66229"); 

      const voteButton = new ButtonBuilder().setLabel("Vote").setStyle(ButtonStyle.Link).setURL("https://top.gg/bot/1105149646612987934/");
      row.addComponents(voteButton)
      interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }
          
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
