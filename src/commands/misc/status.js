const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const osu = require('node-os-utils');

async function getPrettyMs() {
    const { default: prettyMilliseconds } = await import('pretty-ms');
    return prettyMilliseconds;
}

function formatNodeStatusField(node, prettyMs, { isDemoted = false, demoteReason = null, rateLimited = null } = {}) {
  const nodeName = node?.id || node?.name || "Lavalink Node";
  const connected = Boolean(node?.connected);
  const demoted = Boolean(isDemoted || node?.isDemoted);
  const reason = demoteReason || node?.demoteReason || 'Excessive errors';

  let statusTag = '';
  if (!connected) {
    statusTag = ' (Disconnected)';
  } else if (demoted) {
    statusTag = ' (Temp Disabled)';
  }

  const name = `Node: ${nodeName}${statusTag}`;
  const players = node?.stats?.players ? node.stats.players : '0';
  const playing = node?.stats?.playingPlayers ? node.stats.playingPlayers : '0';
  const uptime = node?.stats?.uptime && prettyMs ? prettyMs(node.stats.uptime, { compact: true }) : 'N/A';
  const memory = node?.stats?.memory?.used !== undefined ? (node.stats.memory.used / 1024 / 1024).toFixed(2) + ' MB' : 'N/A';
  const cpu = node?.stats?.cpu?.systemLoad !== undefined ? (node.stats.cpu.systemLoad * 100).toFixed(2) + '%' : 'N/A';

  const tempDisabledStr = demoted ? `Yes (${reason})` : 'No';
  let rateLimitStr = '';
  if (rateLimited !== null && rateLimited !== undefined) {
    rateLimitStr = `\nRate Limited: ${rateLimited ? 'True' : 'False'}`;
  }

  const value = `Players: ${players}\nPlaying: ${playing}\nUptime: ${uptime}\nMemory: ${memory}\nCPU: ${cpu}\nTemp Disabled: ${tempDisabledStr}${rateLimitStr}`;

  return { name, value };
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

  formatNodeStatusField,

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
      const demotedNodesMap = new Map();

      if (client.cluster) {
        const results = await client.cluster.broadcastEval(c => c.totalTracksPlayed).catch(() => []);
        totalTracksPlayed = results.reduce((acc, val) => acc + (val || 0), 0);

        try {
          const clusterNodesInfo = await client.cluster.broadcastEval(c => {
            if (!c.manager?.nodeManager?.nodes) return [];
            return Array.from(c.manager.nodeManager.nodes.values()).map(n => ({
              id: n.id,
              isDemoted: Boolean(n.isDemoted),
              demoteReason: n.demoteReason || null
            }));
          });
          for (const list of clusterNodesInfo) {
            if (!Array.isArray(list)) continue;
            for (const item of list) {
              if (item.isDemoted) {
                demotedNodesMap.set(item.id, item.demoteReason || 'Excessive errors');
              }
            }
          }
        } catch {}
      } else {
        totalTracksPlayed = client.totalTracksPlayed; 
      }

      const nodesArray = client.manager?.nodeManager?.nodes ? Array.from(client.manager.nodeManager.nodes.values()) : [];
      const embed = new EmbedBuilder()
        .setColor('#e66229')
        .setDescription(`**System Status**
                      **${uptime}** Uptime  
                      **${cpuCores}** CPU Cores  
                      **${cpuUsage}%** CPU Usage
                      **${memUsage} MB** Memory Usage
                    **${totalTracksPlayed}** Tracks Since Restart`).setFooter({text: `Shard: ${interaction.guild?.shardId ? interaction.guild?.shardId : '0'} | Cluster: ${client.cluster?.id ?? 0}`});

      for (const node of nodesArray) {
        const options = interaction.options.get('ratelimit_check')?.value;
        let rateLimited = null;
        if (options === "yes") {
          const search = await node.search({ query: "https://www.youtube.com/watch?v=C0DPdy98e4c", source: "ytsearch" }).catch(() => null);
          rateLimited = !search?.tracks?.length;
        }

        const isDemoted = Boolean(node.isDemoted || demotedNodesMap.has(node.id));
        const demoteReason = node.demoteReason || demotedNodesMap.get(node.id) || null;

        const field = formatNodeStatusField(node, prettyMs, {
          isDemoted,
          demoteReason,
          rateLimited
        });

        embed.addFields(field);
      }
      return interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("error while running status", error);
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: "An error occurred while fetching status." }).catch(() => {});
      } else {
        return interaction.reply({ content: "An error occurred while fetching status.", flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
