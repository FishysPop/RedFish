const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Plays songs based on the current queue"),

  run: async ({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });
      return;
    }
     try {
    switch (client.playerType) {
      case "both":
        const Lavaplayer = client.manager.players.get(interaction.guild.id);
        const Discordplayer = useQueue(interaction.guild.id);
        if (!Lavaplayer && !Discordplayer) {
          return interaction.reply({
            content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
            ephemeral: true,
          });
        }
        if (Discordplayer) {
          let repeatMode = Discordplayer.repeatMode;

          if (repeatMode === 0) {
            const embed = new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`**Autoplay enabled**`)
              .setFooter({ text: `Run this command again to disable it.` });
            interaction.reply({ embeds: [embed] });
            Discordplayer.setRepeatMode(3);
          } else {
            const embed2 = new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`**Autoplay disabled**`)
              .setFooter({ text: `Run this command again to enable it.` });
            interaction.reply({ embeds: [embed2] });
            Discordplayer.setRepeatMode(0);
          }

        } else if (Lavaplayer) {
          if (Lavaplayer.customData.autoPlay === false) {
            const embed = new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`**Autoplay enabled**`)
              .setFooter({ text: `Run this command again to disable it.` });
            interaction.reply({ embeds: [embed] });
            Lavaplayer.customData.autoPlay = true
          } else {
            const embed2 = new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`**Autoplay disabled**`)
              .setFooter({ text: `Run this command again to enable it.` });
            interaction.reply({ embeds: [embed2] });
            Lavaplayer.customData.autoPlay = false
          }

        } else {
          return interaction.reply({
            content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
            ephemeral: true,
          });
        }
        break;
      case "lavalink":
        const player = client.manager.players.get(interaction.guild.id);
        if (!player) {
          return interaction.reply({
            content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
            ephemeral: true,
          });
        }
        if (player.customData.autoPlay === false) {
          const embed = new EmbedBuilder()
            .setColor("#e66229")
            .setDescription(`**Autoplay enabled**`)
            .setFooter({ text: `Run this command again to disable it.` });
          interaction.reply({ embeds: [embed] });
          player.customData.autoPlay = true
        } else {
          const embed2 = new EmbedBuilder()
            .setColor("#e66229")
            .setDescription(`**Autoplay disabled**`)
            .setFooter({ text: `Run this command again to enable it.` });
          interaction.reply({ embeds: [embed2] });
          player.customData.autoPlay = false
        }
        break;
      case "discord_player":
        const queue = useQueue(interaction.guildId);
        if (!queue || !queue.isPlaying()) {
          interaction.reply({
            content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
            ephemeral: true,
          });
          return;
        }
        let repeatMode = queue.repeatMode;

        if (repeatMode === 0) {
          const embed = new EmbedBuilder()
            .setColor("#e66229")
            .setDescription(`**Autoplay enabled**`)
            .setFooter({ text: `Run this command again to disable it.` });
          interaction.reply({ embeds: [embed] });
          queue.setRepeatMode(3);
        } else {
          const embed2 = new EmbedBuilder()
            .setColor("#e66229")
            .setDescription(`**Autoplay disabled**`)
            .setFooter({ text: `Run this command again to enable it.` });
          interaction.reply({ embeds: [embed2] });
          queue.setRepeatMode(0);
        }
        break;
    }
  } catch (error) {
   console.log('error running autoplay command', error)   
  }
    return;
    // devOnly: Boolean,
    //testOnly: true,
    // options: Object[],
    // deleted: true
  },
};
