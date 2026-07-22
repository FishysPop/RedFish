const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Disconnects the bot from the call"),

  run: ({ interaction, client, handler }) => {
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

    player.destroy().catch((e) => null);
    interaction.reply("Disconnected");
  },
};
