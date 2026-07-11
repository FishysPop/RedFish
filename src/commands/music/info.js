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

    const player = client.manager.players.get(interaction.guild.id);
    if (!player || !player.playing) {
      return interaction.reply({
        content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const currentTrack = player.queue.current;
    const currentPos = player.queue.kazagumoPlayer.shoukaku.position;
    const songLength = player.queue.current.length;

    if (player.loop === "queue") {
      repeatModeEmoji = "✅";
    }
    if (player.customData.autoPlay === true) {
      autoPlayEmoji = "✅";
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: "Now Playing" })
      .setColor("#e66229")
      .setTitle(currentTrack.title)
      .setURL(currentTrack.uri)
      .setDescription(`By: **${currentTrack.author}**`)
      .setThumbnail(currentTrack.thumbnail)
      .setTimestamp()
      .addFields([
        {
          name: "Progress",
          value: `${createProgressBar(currentPos, songLength)} (${((currentPos / 1000) / (songLength / 1000) * 100).toFixed(0)}%)`,
        },
        {
          name: "Settings",
          value: `Loop: ${repeatModeEmoji} AutoPlay: ${autoPlayEmoji}`,
        },
      ])
      .setFooter({
        text: `Requested by ${currentTrack.requester?.username} | Node: ${player.queue.kazagumoPlayer.shoukaku.node.name}`,
      });

    return interaction.reply({ embeds: [embed] });
  },
};
