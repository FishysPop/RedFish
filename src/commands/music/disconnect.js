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
    if (!interaction.member.voice.channel) {
      interaction.reply({content: 'You are not connected to a voice channel.',ephemeral: true})
      return;
  }
   switch (client.playerType) {
    case "both":
      const Lavaplayer = client.manager.players.get(interaction.guild.id);
      const Discordplayer = useQueue(interaction.guild.id)
      if (!Lavaplayer && !Discordplayer) {
       return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
      }
      if (Discordplayer) {
       Discordplayer.delete()
       interaction.reply("Disconnected")
      } else if (Lavaplayer) {
       Lavaplayer.destroy();
       interaction.reply("Disconnected")
      } else {
        return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
      }
    break;
    case "lavalink":
      const player = client.manager.players.get(interaction.guild.id);
      if (!player) {
        return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
       }
        player.destroy();
        interaction.reply("Disconnected")
    break;
    case "discord_player":
      const queue = useQueue(interaction.guildId)
      if (!queue || !queue.isPlaying()) {
        interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
        return;
    }
        queue.delete();
        interaction.reply("Disconnected")
    break;
  }




  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
