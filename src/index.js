const { ClusterManager } = require('discord-hybrid-sharding');
require("dotenv").config();


const manager = new ClusterManager(`src/bot.js`, {
    totalShards: 'auto', // or numeric shard count
    shardsPerClusters: 2, // 2 shards per process
    mode: 'worker', // you can also choose "worker"
    token: process.env.TOKEN,
});

manager.spawn({ timeout: -1 });

manager.on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`));
