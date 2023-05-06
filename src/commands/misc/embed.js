const { EmbedBuilder } = require("discord.js");
module.exports = {
  name: "embed",
  description: "Creates an embed template",
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,

  callback: (client, interaction) => {
    const embed = new EmbedBuilder()
      .setTitle("Embed title")
      .setDescription("this is an embed description")
      .setColor("Random")
      .addFields({ name: "Field title", value: "Random Value", inline: true });
    interaction.reply({ embeds: [embed] });
  },
};
