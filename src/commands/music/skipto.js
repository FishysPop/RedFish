const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("skipto")
    .setDescription("Skip to a certain song in the queue.")
    .addIntegerOption((option) => option.setName("amount").setDescription("The amount of seconds to seek to.").setRequired(true)),

  run: async ({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      interaction.reply({ content: "You can only run this command in a server.", ephemeral: true,});
     return;
    }
    if (!interaction.member.voice.channel) {
      interaction.reply({content: 'You are not connected to a voice channel.',ephemeral: true})
      return;
  }
  const amount = interaction.options.getInteger("amount")

  switch (client.playerType) {
    case "both":
      const Lavaplayer = client.manager.players.get(interaction.guild.id);
      const Discordplayer = useQueue(interaction.guild.id)
      if (!Lavaplayer && !Discordplayer) {
       return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
      }
      if (Discordplayer) {
        if (amount > Discordplayer.tracks.data.length) {
          interaction.reply({
              content: `There are \`${Discordplayer.tracks.data.length}\` tracks in the queue. You cant skip to \`${amount}\`.\n\nView all tracks in the queue with **\`/queue\`**.`,
              ephemeral: true,
            });
            return;
      } 
      Discordplayer.node.skipTo(amount - 1);
      interaction.reply(`${amount} Tracks Skipped`)
      } else if (Lavaplayer) {
        const player = client.manager.players.get(interaction.guild.id);
        if ((amount > player.queue.size) || (amount && !player.queue[amount - 1])) return           interaction.reply({ content: `There are \`${player.queue.size}\` tracks in the queue. You cant skip to \`${amount}\`.\n\nView all tracks in the queue with **\`/queue\`**.`, ephemeral: true,  });;
        if (amount == 1) player.skip();
    
        await player.queue.splice(0, amount - 1);
            await player.skip();
         interaction.reply(`${amount} Tracks Skipped`)
      } else {
        return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
      }
    break;
    case "lavalink":
      const player = client.manager.players.get(interaction.guild.id);
      if ((amount > player.queue.size) || (amount && !player.queue[amount - 1])) return           interaction.reply({ content: `There are \`${player.queue.size}\` tracks in the queue. You cant skip to \`${amount}\`.\n\nView all tracks in the queue with **\`/queue\`**.`, ephemeral: true,  });;
      if (amount == 1) player.skip();
  
      await player.queue.splice(0, amount - 1);
          await player.skip();
       interaction.reply(`${amount} Tracks Skipped`)

    break;
    case "discord_player":
      const queue = useQueue(interaction.guildId)
      if (amount > queue.tracks.data.length) {
        interaction.reply({
            content: `There are \`${queue.tracks.data.length}\` tracks in the queue. You cant skip to \`${amount}\`.\n\nView all tracks in the queue with **\`/queue\`**.`,
            ephemeral: true,
          });
          return;
    } 
    queue.node.skipTo(amount - 1);
    interaction.reply(`${amount} Tracks Skipped`)
    break;
  }
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
