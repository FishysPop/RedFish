const {SlashCommandBuilder,PermissionsBitField, EmbedBuilder} = require('discord.js');
const User = require("../../models/User");

module.exports = {
  data: new SlashCommandBuilder()
  .setName('player-settings')
  .setDescription('Customise the music player to your liking'),


  run: async ({ interaction, client, handler }) => {
    try {
        if (!interaction.inGuild()) {
            interaction.reply({content: "You can only run this command in a server.",ephemeral: true});
           return;
          }   
       await interaction.deferReply();
       const hasVotedInLast12Hrs = await client?.topgg?.hasVoted(interaction.user.id);
       const hasAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator); 
       let hasVoted;
       const userId = interaction.user.id;
       if (client.topgg) {
       let user = await User.findOne({ userId });
       const lastVote = hasVotedInLast12Hrs ? new Date() : null;
 
       // Check if the user exists in the database
       if (!user) {
         user = new User({
           userId: interaction.user.id,
           balance: 0,
           lastVote: lastVote,
           lastDaily: new Date(),
         });
         hasVoted = true;
       } else {
        if (!hasVotedInLast12Hrs) {
         const lastVote = user.lastVote.toDateString();
         const currentDate = new Date().toDateString();
         const timeDiff = Math.abs(new Date(currentDate) - new Date(lastVote));
         const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
         hasVoted = daysDiff >= 3 ? false : true;
        } else {
         hasVoted = true;
         user.lastVote = new Date();
         await user.save();
        }
    }
       } else {
        hasVoted = true;
    }
    if (hasVoted || hasAdmin) {
      const embed = new EmbedBuilder()
        .setTitle("Player Settings")
        .setDescription("You have access to player settings!")
        .setColor("#e66229"); // Green for success

      if (hasVoted) {
        embed.addFields({ name: "Vote Status", value: "✅ You have voted in the last 3 days.", inline: true });
      }
      if (hasAdmin) {
        embed.addFields({ name: "Admin Status", value: "✅ You have administrator permissions.", inline: true });
      }

      interaction.editReply({ embeds: [embed] });
      return;
    } else {
      const embed = new EmbedBuilder()
        .setTitle("Player Settings")
        .setDescription("You need to vote to access player settings.")
        .setColor("#e66229"); // Red for error

      interaction.editReply({ embeds: [embed] });
      return;
    }
          
  } catch (error) {
   console.log("error while running playerSettings",error)   
  }
  },
  // devOnly: Boolean,
  //testOnly: true,
  //deleted: true,
};
