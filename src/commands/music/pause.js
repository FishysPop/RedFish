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

    const player = client.manager.players.get(interaction.guild.id);
    if (!player) {
      return interaction.reply({
        content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const playing = player.paused;
    if (!playing) {
      const PlayerPauseEmbed = new EmbedBuilder()
        .setColor("#e66229")
        .setDescription(`${interaction.user} has paused the queue.`);
      interaction.reply({ embeds: [PlayerPauseEmbed] });
      player.pause(true);
    } else {
      const PlayerResumedEmbed = new EmbedBuilder()
        .setColor("#e66229")
        .setDescription(`${interaction.user} has resumed the queue.`);
      interaction.reply({ embeds: [PlayerResumedEmbed] });
      player.pause(false);
    }
  },
};
