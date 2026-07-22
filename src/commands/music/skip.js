const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips a song."),

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
    if (!player || (!player.queue.current && !player.queue.tracks.length)) {
      return interaction.reply({
        content: `There is nothing currently playing to skip.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await player.skip(0, false).catch(() => null);
    interaction.reply("Track Skipped");
  },
};
