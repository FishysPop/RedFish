const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder, MessageFlags } = require("discord.js");
const { useQueue } = require('discord-player');
module.exports =  {
    data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("Skip a time of a song")
    .addIntegerOption((option) => option.setName("seconds").setDescription("The amount of seconds to seek to.").setRequired(true)),

  run: async ({ interaction, client, handler }) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "You can only run this command in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }
  
    const seconds = interaction.options.getInteger("seconds");
  
    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: 'You are not connected to a voice channel.', flags: MessageFlags.Ephemeral });
    }
  
    switch (client.playerType) {
      case "both":

        const Lavaplayer = client.manager.players.get(interaction.guild.id);
        const Discordplayer = useQueue(interaction.guild.id)
        if (!Lavaplayer && !Discordplayer) {
         return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
        }
        if (Discordplayer) {
          Discordplayer.node.seek(seconds * 1000 + Discordplayer.node.getTimestamp()?.current.value);
        } else if (Lavaplayer) {
          if (!Lavaplayer) return interaction.reply({ content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral });
          const currentPos = Lavaplayer.queue.kazagumoPlayer.shoukaku.position / 1000; 
          const songLength = Lavaplayer.queue.current.length / 1000; 
          let newPosition = currentPos + seconds; 
          if (newPosition >= songLength) {
            newPosition = songLength - 1;
          }
          
          if (newPosition < 0 || newPosition > songLength) {
            return interaction.reply({ content: "You can't seek beyond the duration of the song!", flags: MessageFlags.Ephemeral });
          }
          await Lavaplayer.seek(newPosition * 1000); 
        } else {
          return interaction.reply({content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral})
        }

      break;
      case "discord_player":
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.isPlaying()) {
          return interaction.reply({ content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral });
        }
        queue.node.seek(seconds * 1000 + queue.node.getTimestamp()?.current.value);

        break;
      case "lavalink":

        const player = client.manager.players.get(interaction.guild.id);
        if (!player) return interaction.reply({ content: `There is nothing currently playing. \nPlay something using **\`/play\`**`, flags: MessageFlags.Ephemeral });
        const currentPos = player.queue.kazagumoPlayer.shoukaku.position / 1000; 
        const songLength = player.queue.current.length / 1000; 
        let newPosition = currentPos + seconds; 
        if (newPosition >= songLength) {
          newPosition = songLength - 1;
        }
        
        if (newPosition < 0 || newPosition > songLength) {
          return interaction.reply({ content: "You can't seek beyond the duration of the song!", flags: MessageFlags.Ephemeral });
        }
        await player.seek(newPosition * 1000); 
        break;
      default:
        return interaction.reply({ content: `Unsupported player type: ${client.playerType}`, flags: MessageFlags.Ephemeral });
    }
  
    return interaction.reply(`Seeked ${seconds} seconds`);
  
    
  },

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
