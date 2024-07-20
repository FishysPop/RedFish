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
  .setDescription('Shows stats about the bot')
  .addStringOption(option => option
    .setName('ratelimit_check')
    .setDescription('Checks the nodes if they are ratelimited')
    .addChoices(
        { name: 'Yes', value: 'yes' },
        { name: 'No', value: 'false' },
    )),


  run: async ({ interaction, client, handler }) => {
    try {
      await interaction.deferReply();
      const uptimeMs = parseFloat(process.uptime().toFixed(0));
      const prettyMs = await getPrettyMs(); 
      const uptime = prettyMs(uptimeMs * 1000, {compact: true});
      const cpuUsage = await osu.cpu.usage();
      const memUsage = Math.ceil((await osu.mem.info()).usedMemMb);  
      const cpuCores = osu.cpu.count();
      switch (client.playerType) {
        case "both":
          const player2 = useMainPlayer();
          const playerStats3 = player2.generateStatistics()
          const playerStats4 = client.manager.shoukaku.nodes

      
          const embed3 = new EmbedBuilder()
          .setColor('#e66229')
          .setDescription(`**System Status**
                        **${uptime}** Uptime  
                        **${cpuCores}** CPU Cores  
                        **${cpuUsage}%** CPU Usage
                        **${memUsage} MB** Memory Usage`)
          .addFields(
              {
                name: "**Player Status**",
                value: `
                      **${playerStats3.queues.length}** Channels Connected
                      **${playerStats3.queues.reduce((acc, queue) => acc + queue.tracksCount, 0)}** Tracks Queued
                      **${playerStats3.queues.reduce((acc, queue) => acc + queue.listeners, 0)}** Users listening
                      **${client.totalTracksPlayed}** Tracks Since Restart` 
              }
            )
            for (const node of playerStats4.values()) {
              embed3.addFields({
                name: `Node: ${node.name}`,
                value: `Players: ${node.stats?.players ? node.stats.players : '0'}\nPlaying: ${node.stats?.playingPlayers ? node.stats.playingPlayers : '0'}\nUptime: ${node.stats?.uptime ? prettyMs(node.stats?.uptime, {compact: true}) : 'N/A'}\nMemory: ${node.stats?.memory ? (node.stats.memory.used / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}\nCPU: ${node.stats?.cpu.systemLoad ? (node.stats.cpu.systemLoad * 100).toFixed(2) + '%' : 'N/A'}`,
              });
  }
            interaction.editReply({ embeds: [embed3] });
            break;
        break;
        case "lavalink":
        const playerStats2 = client.manager.shoukaku.nodes
        const embed2 = new EmbedBuilder()
        .setColor('#e66229')
        .setDescription(`**System Status**
                      **${uptime}** Uptime  
                      **${cpuCores}** CPU Cores  
                      **${cpuUsage}%** CPU Usage
                      **${memUsage} MB** Memory Usage
                    **${client.totalTracksPlayed}** Tracks Since Restart`)
                    for (const node of playerStats2.values()) {
                      const options = interaction.options.get('ratelimit_check')?.value;
                      let RateLimited = '';
                      if (options === "yes")  {
                     const search = await client.manager.search("https://www.youtube.com/watch?v=C0DPdy98e4c", {engine: 'youtube', nodeName: node.name})
                      if (search.tracks?.length) {
                        RateLimited = '\n Rate Limited: False' 
                      } else {
                        RateLimited = '\n Rate Limited: True' 
                      }
                    }
                      embed2.addFields({
                        name: `Node: ${node.name}`,
                        value: `Players: ${node.stats?.players ? node.stats.players : '0'}\nPlaying: ${node.stats?.playingPlayers ? node.stats.playingPlayers : '0'}\nUptime: ${node.stats?.uptime ? prettyMs(node.stats?.uptime, {compact: true}) : 'N/A'}\nMemory: ${node.stats?.memory ? (node.stats.memory.used / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}\nCPU: ${node.stats?.cpu.systemLoad ? (node.stats.cpu.systemLoad * 100).toFixed(2) + '%' : 'N/A'}${RateLimited}`,
                      });
          }
       interaction.editReply({ embeds: [embed2] });
       
    break;  
    case "discord_player":
    const player = useMainPlayer();
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
      break;
    }

  } catch (error) {
   console.log("error while running status",error)   
  }
  },
  // devOnly: Boolean,
  //testOnly: true,
  //deleted: true,
};
