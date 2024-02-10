const {Client,Interaction,AttachmentBuilder,SlashCommandBuilder,} = require('discord.js');
const canvacord = require('canvacord');
const calculateLevelXp = require('../../utils/calculateLevelXp');
const Level = require('../../models/Level');
const GuildSettings = require('../../models/GuildSettings');


module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  run: async ({client, interaction}) => {
    if (!interaction.inGuild()) {
      interaction.reply('You can only run this command inside a server.');
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

    await interaction.deferReply();

    const mentionedUserId = interaction.options.get('user')?.value;
    const targetUserId = mentionedUserId || interaction.member.id;
    const targetUserObj = await interaction.guild.members.fetch(targetUserId);

    const fetchedLevel = await Level.findOne({
      userId: targetUserId,
      guildId: interaction.guild.id,
    });

    if (!fetchedLevel) {
      interaction.editReply(
        mentionedUserId
          ? `${targetUserObj.user.tag} doesn't have any levels yet. Try again when they chat a little more.`
          : "You don't have any levels yet. Chat a little more and try again."
      );
      return;
    }

    let allLevels = await Level.find({ guildId: interaction.guild.id }).select(
      '-_id userId level xp'
    );

    allLevels.sort((a, b) => {
      if (a.level === b.level) {
        return b.xp - a.xp;
      } else {
        return b.level - a.level;
      }
    });

    let currentRank = allLevels.findIndex((lvl) => lvl.userId === targetUserId) + 1;
    const rank = new canvacord.Rank()
      .setAvatar(targetUserObj.user.displayAvatarURL({ size: 256 }))
      .setRank(currentRank)
      .setLevel(fetchedLevel.level)
      .setCurrentXP(fetchedLevel.xp)
      .setRequiredXP(calculateLevelXp(fetchedLevel.level))
      .setProgressBar('#20B2AA', 'COLOR')
      .setBackground('IMAGE', "https://i.imgur.com/XT5vLmD.jpeg")
      .setOverlay('#D97614', 20, false)
      .setStatus('online')
      .setUsername(`@${targetUserObj.user.username}`);

    const data = await rank.build();
    const attachment = new AttachmentBuilder(data);
    interaction.editReply({ files: [attachment] });
  },

  data: new SlashCommandBuilder()
  .setName('level')
  .setDescription("Check your or someone elses level")
  .addUserOption((option) => option
  .setName('user')
  .setDescription('The users level you want to see')),
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};