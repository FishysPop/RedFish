const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("pause or resume a song."),

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

    if (!player.paused) {
      const PlayerPauseEmbed = new EmbedBuilder()
        .setColor("#e66229")
        .setDescription(`${interaction.user} has paused the queue.`);
      interaction.reply({ embeds: [PlayerPauseEmbed] });
      await player.pause();
    } else {
      const PlayerResumedEmbed = new EmbedBuilder()
        .setColor("#e66229")
        .setDescription(`${interaction.user} has resumed the queue.`);
      interaction.reply({ embeds: [PlayerResumedEmbed] });
      await player.resume();
    }
  },
};
