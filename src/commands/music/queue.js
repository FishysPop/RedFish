const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle ,ActionRowBuilder} = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Shows all the current songs in queue"),

  run: async ({ interaction, client, handler }) =>  {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        ephermeral: true,
      });
     return;
    }
    const queue = useQueue(interaction.guildId);
    if (!queue)
      return interaction.reply({
        content: `There is nothing currently playing`,
        ephemeral: true,
      });

    const formatTracks = queue.tracks.toArray();

    if (formatTracks.length === 0) {
      return interaction.reply({
        content: `There aren't any other tracks in the queue. Use **/info** to show information about the current track.`,
        ephemeral: true,
      });
    }

    const tracks = formatTracks.map(
      (track, idx) => `**${idx + 1}.** [${track.title}](${track.url}) | ${track.requestedBy.username}#${track.requestedBy.discriminator}`
    );

    const chunkSize = 10;
    const pages = Math.ceil(tracks.length / chunkSize);

    const embeds = [];
    for (let i = 0; i < pages; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;

      const embed = new EmbedBuilder()
        .setColor("#e66229")
        .setTitle("Tracks Queue")
        .setDescription(
          tracks.slice(start, end).join("\n") || "**No queued songs**"
        )
        .setFooter({
          text: `Page ${i + 1} | Total ${queue.tracks.size} tracks`,
        });

      embeds.push(embed);
    }

    if (embeds.length === 1) {
      return interaction.reply({
        embeds: [embeds[0]],
      });
    }

    const prevButton = new ButtonBuilder()
      .setCustomId("prev")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬅️");

    const nextButton = new ButtonBuilder()
      .setCustomId("next")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("➡️");

    const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

    const message = await interaction.reply({
      embeds: [embeds[0]],
      components: [row],
      fetchReply: true,
    });

    let currentIndex = 0;
    const collector = message.createMessageComponentCollector({
      idle: 60000,
    });

    collector.on("collect", (i) => {
      i.deferUpdate();

      switch (i.customId) {
        case "prev":
          currentIndex =
            currentIndex === 0 ? embeds.length - 1 : currentIndex - 1;
          break;
        case "next":
          currentIndex =
            currentIndex === embeds.length - 1 ? 0 : currentIndex + 1;
          break;
        default:
          break;
      }

      message.edit({
        embeds: [embeds[currentIndex]],
        components: [row],
      });
    });

    collector.on("end", () => {
      message.edit({
        components: [],
      });
    });
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
