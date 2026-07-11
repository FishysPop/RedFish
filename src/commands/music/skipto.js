const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skipto")
    .setDescription("Skip to a certain song in the queue.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The position in the queue to skip to.")
        .setRequired(true)
    ),

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

    const amount = interaction.options.getInteger("amount");
    const player = client.manager.players.get(interaction.guild.id);
    if (!player) {
      return interaction.reply({
        content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (amount > player.queue.size || (amount && !player.queue[amount - 1])) {
      return interaction.reply({
        content: `There are \`${player.queue.size}\` tracks in the queue. You cant skip to \`${amount}\`.\n\nView all tracks in the queue with **\`/queue\`**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (amount === 1) {
      player.skip();
    } else {
      await player.queue.splice(0, amount - 1);
      await player.skip();
    }
    interaction.reply(`${amount} Tracks Skipped`);
  },
};
