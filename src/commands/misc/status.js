const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const osu = require('node-os-utils');

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

      let totalTracksPlayed = 0; 

      if (client.cluster) {
        const results = await client.cluster.broadcastEval(c => c.totalTracksPlayed);
        totalTracksPlayed = results.reduce((acc, val) => acc + val, 0); 
      } else {
        totalTracksPlayed = client.totalTracksPlayed; 
      }

      const playerStats = client.manager.shoukaku.nodes;
      const embed = new EmbedBuilder()
        .setColor('#e66229')
        .setDescription(`**System Status**
                      **${uptime}** Uptime  
                      **${cpuCores}** CPU Cores  
                      **${cpuUsage}%** CPU Usage
                      **${memUsage} MB** Memory Usage
                    **${totalTracksPlayed}** Tracks Since Restart`).setFooter({text: `Shard: ${interaction.guild?.shardId ? interaction.guild?.shardId : '0'} | Cluster: ${client.cluster?.id ?? 0}`});

      for (const node of playerStats.values()) {
        const options = interaction.options.get('ratelimit_check')?.value;
        let RateLimited = '';
        if (options === "yes")  {
          const search = await client.manager.search("https://www.youtube.com/watch?v=C0DPdy98e4c", {engine: 'youtube', nodeName: node.name});
          if (search.tracks?.length) {
            RateLimited = '\n Rate Limited: False';
          } else {
            RateLimited = '\n Rate Limited: True';
          }
        }
        embed.addFields({
          name: `Node: ${node.name}`,
          value: `Players: ${node.stats?.players ? node.stats.players : '0'}\nPlaying: ${node.stats?.playingPlayers ? node.stats.playingPlayers : '0'}\nUptime: ${node.stats?.uptime ? prettyMs(node.stats?.uptime, {compact: true}) : 'N/A'}\nMemory: ${node.stats?.memory ? (node.stats.memory.used / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}\nCPU: ${node.stats?.cpu.systemLoad ? (node.stats.cpu.systemLoad * 100).toFixed(2) + '%' : 'N/A'}${RateLimited}`,
        });
      }
      interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.log("error while running status", error)   
    }
  },
};
