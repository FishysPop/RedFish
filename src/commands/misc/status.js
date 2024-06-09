const {SlashCommandBuilder,EmbedBuilder} = require('discord.js');
const osu = require('node-os-utils');
const { useMainPlayer } = require('discord-player');



async function getPrettyMs() {
    const { default: prettyMilliseconds } = await import('pretty-ms');
    return prettyMilliseconds;
  }

module.exports = {
  data: new SlashCommandBuilder()
  .setName('status')
  .setDescription('Shows stats about the bot.'),


  run: async ({ interaction, client, handler }) => {
    try {
    if (client.playerType === 'lavalink') return interaction.reply("lavalink is not supported yet")
    await interaction.deferReply();
    const player = useMainPlayer();
    const uptimeMs = parseFloat(process.uptime().toFixed(0));
    const prettyMs = await getPrettyMs(); 
    const uptime = prettyMs(uptimeMs * 1000, {compact: true});
    const cpuUsage = await osu.cpu.usage();
    const memUsage = Math.ceil((await osu.mem.info()).usedMemMb);  
    const cpuCores = osu.cpu.count();
    const playerStats = player.generateStatistics()

    const embed = new EmbedBuilder()
    .setColor('#e66229')
    .setDescription(`**Player Status**
                **${playerStats.queues.length}** Channels Connected
                **${playerStats.queues.reduce((acc, queue) => acc + queue.tracksCount, 0)}** Tracks Queued
                **${playerStats.queues.reduce((acc, queue) => acc + queue.listeners, 0)}** Users listening
                **${client.totalTracksPlayed}** Tracks Since Restart`)
    .addFields(
        {
          name: "**System Status**",
          value: `**${uptime}** Uptime  
                  **${cpuCores}** CPU Cores  
                  **${cpuUsage}%** CPU Usage
                  **${memUsage} MB** Memory Usage` 
                  
        }
      )
    
      interaction.editReply({ embeds: [embed] });


          
  } catch (error) {
   console.log("error while running status",error)   
  }
  },
  // devOnly: Boolean,
  //testOnly: true,
  //deleted: true,
};
