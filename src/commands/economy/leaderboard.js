const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const Level = require("../../models/Level");
const GuildSettings = require("../../models/GuildSettings")

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('See the top levels of the server'),
  run: async ({ client, interaction }) => {
    if (!interaction.inGuild()) {
        interaction.reply({
          content: "You can only run this command in a server.",
          ephemeral: true,
        });
        return;
      } 
    const guildSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    if(!guildSettings) return interaction.reply({
      content: "Leveling is not enabled in this server. Enable it with **\`/level-setting\`**",
      ephemeral: true,
    });
    if(guildSettings.levels === false) return interaction.reply({
      content: "Leveling is not enabled in this server. Enable it with **\`/level-setting\`**",
      ephemeral: true,
    });
    try {
      const guildId = interaction.guild.id;

      const levels = await Level.find({ guildId })
        .sort({ level: -1, xp: -1 }) // Sort by level descending and then by XP descending
        .limit(150);

      if (!levels || levels.length === 0) {
        return interaction.reply({ content: 'No levels found in the leaderboard for this guild.', ephemeral: true });
      }

      const chunkSize = 15;
      const totalPages = Math.ceil(levels.length / chunkSize);

      let currentPage = 0;

      const embeds = [];

      const updateEmbed = async (page) => {
        const start = page * chunkSize;
        const end = Math.min(start + chunkSize, levels.length);
        const embedColor = parseInt('0099ff', 16);
        const embed = {
          color: embedColor,
          title: `Leaderboard (Page ${page + 1}/${totalPages})`,
          description: "",
          timestamp: new Date(),
        };

        for (let i = start; i < end; i++) {
          const level = levels[i];
          embed.description += `#${i + 1} - <@${level.userId}> Level: ${level.level} XP: ${level.xp}\n`; // Concatenate user, level, and XP information
        }

        return embed;
      };

      for (let page = 0; page < totalPages; page++) {
        embeds.push(await updateEmbed(page));
      }

      const prevButton = new ButtonBuilder()
        .setCustomId("prev")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⬅️");

      const nextButton = new ButtonBuilder()
        .setCustomId("next")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➡️");

      const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

      const message = await interaction.reply({
        embeds: [embeds[currentPage]],
        components: [row],
        fetchReply: true,
      });

      const collector = message.createMessageComponentCollector({
        idle: 60000,
      });

      collector.on("collect", async (i) => {
        i.deferUpdate();

        switch (i.customId) {
          case "prev":
            currentPage = (currentPage === 0) ? embeds.length - 1 : currentPage - 1;
            break;
          case "next":
            currentPage = (currentPage === embeds.length - 1) ? 0 : currentPage + 1;
            break;
          default:
            break;
        }

        await message.edit({
          embeds: [embeds[currentPage]],
          components: [row],
        });
      });

      collector.on("end", () => {
        message.edit({
          components: [],
        });
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      interaction.reply({ content: 'Error fetching leaderboard.', ephemeral: true });
    }
  },
};
