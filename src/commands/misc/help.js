const {SlashCommandBuilder,EmbedBuilder} = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
  .setName('help')
  .setDescription('Shows how commands work'),


  run: async ({ interaction, client, handler }) => {
	  await interaction.deferReply();  

      const helpEmbed = new EmbedBuilder()
      .setColor("#e66229")
      .setTitle("Help")
      .setDescription(`\nServer management
      /autorole | Gives the user a role when they join
      /autoroom-setup | A setup menu for autorooms
      /level-settings | Disable or enable levels
      /welcome-setup | A setup menu for welcomes
      \nGiveaways
      /giveaway create | Creates a giveaway
      /giveaway delete | Delete an active giveaway
      /giveaway end | Ends a currently running giveaway
      /giveaway reroll | Rerolls a giveaway (Cannot be older than 3 months)
      /giveaway view-entries | View who entered the giveaway
      \nModeration
      /ban | Bans a user from the server
      /kick | Kicks a user from the server
      /timeout | Set a custom timeout duration for a user
      \nEconomy
      /balance | Check your own balace or someone elses
      /daily | Claim your daily reward
      /level | Check your own level or someone elses
      /leaderboard | Shows the top levels in this server.
      \nMusic
      /play | Play a song or playlist
      /queue | Shows the current queue
      /info | Shows details about the current song
      /skipto | Skip to a certain song in the queue
      /skip | Skips the current song
      /seek | Skips to a specified time
      /autoplay | Will automaticly find and play a song at the end of the queue
      /disconnet | Removes the bot from the vc
      /radio | Play from a radio station
      /pause | Resumes playback
      /player-settings | Customize the music player to your liking
      \n If need any further assistance join the [Support Server](https://discord.com/invite/rDHPK2er3j) or please dm fishypop
      `);
 
      interaction.editReply({
        embeds: [helpEmbed],
        components: [],
      });
  },
  // devOnly: Boolean,
  //testOnly: true,
  //deleted: true,
};
