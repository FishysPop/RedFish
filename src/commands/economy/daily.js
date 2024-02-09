const { SlashCommandBuilder } = require("discord.js");
const User = require("../../models/User");

const dailyAmount = 100;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim money every 24 hours'),

  run: async ({ client, interaction }) => {
    try {
      // Ensure the command is used in a guild
      if (!interaction.inGuild()) {
        return interaction.reply({
          content: "You can only run this command in a server.",
          ephemeral: true,
        });
      }

      await interaction.deferReply();

      const userId = interaction.user.id;

      let user = await User.findOne({ userId });

      // Check if the user exists in the database
      if (!user) {
        user = new User({
          userId: interaction.user.id,
          balance: 0,
          lastDaily: new Date(),
        });
      } else {
        // Check if the user has already claimed their daily reward
        const lastDailyDate = user.lastDaily.toDateString();
        const currentDate = new Date().toDateString();

        if (lastDailyDate === currentDate) {
          return interaction.editReply("You have already claimed your daily reward today.");
        }
      }

      // Add the daily amount to the user's balance and update lastDaily
      user.balance += dailyAmount;
      user.lastDaily = new Date();
      await user.save();

      // Send a success message with the new balance
      return interaction.editReply(`${dailyAmount} was added to your balance. Your new balance is ${user.balance}`);
    } catch (error) {
      console.error('Error with daily command:', error);
      return interaction.editReply({ content: 'An error occurred while processing your request.', ephemeral: true });
    }
  },
};
