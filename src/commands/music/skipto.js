const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("skipto")
    .setDescription("Skip to a certain song in the queue.")
    .addIntegerOption((option) => option.setName("amount").setDescription("The amount of seconds to seek to.").setRequired(true)),

  run: ({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });
     return;
    }
   const queue = useQueue(interaction.guildId)
   const amount = interaction.options.getInteger("amount")
   if (!interaction.member.voice.channel) {
    interaction.reply({content: 'You are not connected to a voice channel.',ephemeral: true})
    return;
}
if (!queue || !queue.isPlaying()) {
    interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
    return;
}
    if (amount > queue.tracks.data.length) {
        interaction.reply({
            content: `There are \`${queue.tracks.data.length}\` tracks in the queue. You cant skip to \`${amount}\`.\n\nView all tracks in the queue with **\`/queue\`**.`,
            ephemeral: true,
          });
          return;
    } 
    queue.node.skipTo(amount - 1);
    interaction.reply(`${amount} Tracks Skipped`)
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
