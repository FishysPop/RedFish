const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips a song."),

  run: async ({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      interaction.reply({ content: "You can only run this command in a server.", ephemeral: true,});
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
       Discordplayer.node.skip()
       interaction.reply("Track Skipped")
      } else if (Lavaplayer) {
       Lavaplayer.skip();
        interaction.reply("Track Skipped")
      } else {
        return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
      }
    break;
    case "lavalink":
      const player = client.manager.players.get(interaction.guild.id);
      if (!player) {
        return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
       }
        player.skip();
        interaction.reply("Track Skipped")
    break;
    case "discord_player":
      const queue = useQueue(interaction.guildId)
      if (!queue || !queue.isPlaying()) {
        interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`,ephemeral: true})
        return;
    }
        queue.node.skip()
        interaction.reply("Track Skipped")
    break;
  }

  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
