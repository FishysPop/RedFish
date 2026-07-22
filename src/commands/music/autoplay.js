const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Plays songs based on the current queue"),

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

    try {
      const player = client.manager.getPlayer(interaction.guild.id);
      if (!player) {
        return interaction.reply({
          content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!player.customData) player.customData = {};
      const isAutoPlayEnabled = Boolean(player.customData.autoPlay);

      if (!isAutoPlayEnabled) {
        player.customData.autoPlay = true;
        await player.setRepeatMode("off");
        const embed = new EmbedBuilder()
          .setColor("#e66229")
          .setDescription(`**Autoplay enabled**`)
          .setFooter({ text: `Run this command again to disable it.` });
        return interaction.reply({ embeds: [embed] });
      } else {
        player.customData.autoPlay = false;
        const embed2 = new EmbedBuilder()
          .setColor("#e66229")
          .setDescription(`**Autoplay disabled**`)
          .setFooter({ text: `Run this command again to enable it.` });
        return interaction.reply({ embeds: [embed2] });
      }
    } catch (error) {
      console.log("error running autoplay command", error);
    }
  },
};
