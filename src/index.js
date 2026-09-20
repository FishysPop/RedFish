const { ClusterManager } = require('discord-hybrid-sharding');
require("dotenv").config();


const manager = new ClusterManager(`src/bot.js`, {
    totalShards: 'auto', // or numeric shard count
    shardsPerClusters: 2, // 2 shards per process
    mode: 'process', // you can also choose "worker"
    token: process.env.TOKEN,
});

manager.spawn({ timeout: -1 });

manager.on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`));

const shutdown = () => {
    for (const [, cluster] of manager.clusters) {
        if (typeof cluster.kill === 'function') {
            cluster.kill({ force: true, reason: 'process_shutdown' });
        }
    }
    process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

