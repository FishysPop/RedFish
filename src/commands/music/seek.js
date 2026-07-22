const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("Skip a time of a song")
    .addIntegerOption((option) =>
      option
        .setName("seconds")
        .setDescription("The amount of seconds to seek to.")
        .setRequired(true)
    ),

  run: async ({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "You can only run this command in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const seconds = interaction.options.getInteger("seconds");

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

    const currentPos = (player.position || 0) / 1000;
    const currentTrack = player.queue.current;
    const songLength = ((currentTrack?.info?.duration || currentTrack?.length || 0)) / 1000;
    let newPosition = currentPos + seconds;
    if (newPosition >= songLength) {
      newPosition = songLength - 1;
    }

    if (newPosition < 0 || newPosition > songLength) {
      return interaction.reply({
        content: "You can't seek beyond the duration of the song!",
        flags: MessageFlags.Ephemeral,
      });
    }

    await player.seek(newPosition * 1000);
    return interaction.reply(`Seeked ${seconds} seconds`);
  },
};
