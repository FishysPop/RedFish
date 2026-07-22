const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { convertTime } = require("../../utils/ConvertTime.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Shows info about the current song."),

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

    let autoPlayEmoji = "❌";
    let repeatModeEmoji = "❌";

    function createProgressBar(currentPosition, totalLength, options = {}) {
      const {
        indicator = "\u{1F518}",
        leftChar = "\u25AC",
        rightChar = "\u25AC",
        length = 15,
        timecodes = true,
        separator = "\u2503",
      } = options;

      if (isNaN(length) || length < 0 || !Number.isFinite(length)) {
        throw new Error(`Invalid progress bar length: ${length}`);
      }

      const index = Math.round((currentPosition / totalLength) * length);

      if (index >= 1 && index <= length) {
        const bar = leftChar.repeat(index - 1).split("");
        bar.push(indicator);
        bar.push(rightChar.repeat(length - index));

        if (timecodes) {
          const formattedCurrentTime = convertTime(currentPosition);
          const formattedTotalTime = convertTime(totalLength);
          return `${formattedCurrentTime} ${separator} ${bar.join("")} ${separator} ${formattedTotalTime}`;
        } else {
          return bar.join("");
        }
      } else {
        if (timecodes) {
          const formattedCurrentTime = convertTime(currentPosition);
          const formattedTotalTime = convertTime(totalLength);
          return `${formattedCurrentTime} ${separator} ${indicator}${rightChar.repeat(length - 1)} ${separator} ${formattedTotalTime}`;
        } else {
          return `${indicator}${rightChar.repeat(length - 1)}`;
        }
      }
    }

    const player = client.manager.getPlayer(interaction.guild.id);
    if (!player || !player.playing) {
      return interaction.reply({
        content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const currentTrack = player.queue.current;
    if (!currentTrack) {
      return interaction.reply({
        content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const currentPos = player.position || 0;
    const songLength = currentTrack.info?.duration || currentTrack.length || 0;
    const title = currentTrack.info?.title || currentTrack.title;
    const uri = currentTrack.info?.uri || currentTrack.uri;
    const author = currentTrack.info?.author || currentTrack.author;
    const artworkUrl = currentTrack.info?.artworkUrl || currentTrack.thumbnail || "https://i.imgur.com/K9LWwgw.png";

    if (player.repeatMode === "queue" || player.repeatMode === "track") {
      repeatModeEmoji = "✅";
    }
    if (player.customData?.autoPlay === true) {
      autoPlayEmoji = "✅";
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: "Now Playing" })
      .setColor("#e66229")
      .setTitle(title)
      .setURL(uri)
      .setDescription(`By: **${author}**`)
      .setThumbnail(artworkUrl)
      .setTimestamp()
      .addFields([
        {
          name: "Progress",
          value: `${createProgressBar(currentPos, songLength)} (${((currentPos / 1000) / (songLength / 1000 || 1) * 100).toFixed(0)}%)`,
        },
        {
          name: "Settings",
          value: `Loop: ${repeatModeEmoji} AutoPlay: ${autoPlayEmoji}`,
        },
      ])
      .setFooter({
        text: `Requested by ${currentTrack.userData?.requester?.globalName || currentTrack.userData?.requester?.username || currentTrack.requester?.requester?.globalName || currentTrack.requester?.requester?.username || currentTrack.requester?.globalName || currentTrack.requester?.username || (typeof currentTrack.requester === 'string' ? currentTrack.requester : 'Unknown')} | Node: ${player.node?.id || 'Unknown'}`,
      });

    return interaction.reply({ embeds: [embed] });
  },
};
