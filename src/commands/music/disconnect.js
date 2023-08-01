const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, italic } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Disconnects the bot from the call"),


  run: ({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });
     return;
    }
   const queue = useQueue(interaction.guildId)
   try {
    queue.delete();
    interaction.reply("Disconnected")
   } catch {
    interaction.reply({content: 'There is no music playing',ephemeral: true,})
   }
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
