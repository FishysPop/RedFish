const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const { convertTime } = require("../../utils/ConvertTime.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Shows all the current songs in queue"),

  run: async ({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "You can only run this command in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (!interaction.member.voice.channel) {
      return interaction.reply({
        content: "You are not connected to a voice channel.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const player = client.manager.getPlayer(interaction.guild.id);
    if (!player) {
      return interaction.reply({
        content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const queueTracks = player.queue.tracks || [];
    if (queueTracks.length === 0) {
      return interaction.reply({
        content: `There aren't any other tracks in the queue. Use **/info** to show information about the current track.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    let embeds = [];
    const chunkSize = 10;
    let currentIndex = 0;

    const prevButton = new ButtonBuilder()
      .setCustomId("prev")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬅️");

    const nextButton = new ButtonBuilder()
      .setCustomId("next")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("➡️");

    const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

    const tracks = queueTracks.map(
      (track, idx) => {
        let req = track.userData?.requester || track.requester;
        if (req && typeof req === "object" && req.requester) req = req.requester;
        const ping = req?.id ? `<@${req.id}>` : (req?.globalName || req?.username || (typeof req === 'string' ? req : 'Unknown'));
        return `\`${idx + 1}.\` [${track.info?.title || track.title}](${track.info?.uri || track.uri}) - ${track.info?.author || track.author} | ${ping}`;
      }
    );

    const pages = Math.ceil(tracks.length / chunkSize);

    for (let i = 0; i < pages; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;

      const queueDuration = queueTracks.reduce((acc, tr) => acc + (tr.info?.duration || tr.length || 0), 0);

      const embed = new EmbedBuilder()
        .setColor("#e66229")
        .setTitle("Tracks Queue")
        .setDescription(tracks.slice(start, end).join("\n") || "**No queued songs**")
        .setFooter({
          text: `Page ${i + 1}/${pages} | Tracks: ${queueTracks.length} | Time remaining: ${convertTime(queueDuration)}`,
        });

      embeds.push(embed);
    }

    if (embeds.length === 1) {
      return interaction.reply({
        embeds: [embeds[0]],
      });
    }

    await interaction.reply({
      embeds: [embeds[0]],
      components: [row],
    });

    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({
      idle: 60000,
    });

    collector.on("collect", (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "This is not your menu.", flags: MessageFlags.Ephemeral });
      }
      i.deferUpdate();

      switch (i.customId) {
        case "prev":
          currentIndex = currentIndex === 0 ? embeds.length - 1 : currentIndex - 1;
          break;
        case "next":
          currentIndex = currentIndex === embeds.length - 1 ? 0 : currentIndex + 1;
          break;
        default:
          break;
      }

      interaction.editReply({
        embeds: [embeds[currentIndex]],
        components: [row],
      });
    });

    collector.on("end", () => {
      message.edit({
        components: [],
      }).catch(() => {});
    });
  },
};
