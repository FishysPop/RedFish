require("dotenv").config();
const { Client, GatewayIntentBits, Collection, Options } = require("discord.js");
const mongoose = require("mongoose");
const { CommandHandler } = require('djs-commander');
const fs = require('fs');
const Topgg = require("@top-gg/sdk");
const { ClusterClient, getInfo } = require('discord-hybrid-sharding');
const AnalyticsModel = require("./models/Analytics"); 
const cacheManager = require('./utils/cacheManager');
const { Client: YTIClient } = require("youtubei");


const path = require('path');

const clientOptions = {
  shards: getInfo().SHARD_LIST,
  shardCount: getInfo().TOTAL_SHARDS,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ],
  sweepers: {
    ...Options.defaultSweeperSettings,
    messages: {
      interval: 3600, // Every hour
      lifetime: 1800, // Remove messages older than 30 minutes
    },
    users: {
      interval: 3600, // Every hour
      filter: () => user => user.id !== client.user.id,
    },
  },
};

const client = new Client(clientOptions);
cacheManager.initializeCacheManager(client); 


if (process.env.LAVALINK === 'true') {
  const { LavalinkManager } = require("lavalink-client");
  const lavaNodes = [];
  const lavaURI = process.env.LAVALINK_URI; 
  if (lavaURI) {
    const nodes = lavaURI.split(';');
    nodes.forEach((node, index) => {
      const [ip, portAndAuth] = node.split(':');
      if (portAndAuth) {
        const [port, password] = portAndAuth.split('@');
        lavaNodes.push({
          id: `${process.env.NAME || 'node'}_${index + 1}`,
          host: ip,
          port: parseInt(port, 10),
          authorization: password,
          secure: false
        });
      } else {
        console.warn(`Invalid Lavalink node configuration: ${node}`);
      }
    });
  } else {
    console.warn('No Lavalink node configuration found. eg LAVALINK_URI = YOUR_IP:PORT@PASSWORD');
  }

  client.manager = new LavalinkManager({
    nodes: lavaNodes,
    sendToShard: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) guild.shard.send(payload);
    },
    client: {
      id: process.env.CLIENT_ID || "1050000000000000000",
      username: "RedFish",
    },
    autoMove: true,
    autoSkipOnResolveError: true,
    playerOptions: {
      defaultSearchPlatform: "ytmsearch",
      onEmptyQueue: {
      },
      onDisconnect: {
        destroy: true,
        autoReconnect: true,
      },
    },
  });

  client.once("ready", () => {
    client.manager.options.client.id = client.user.id;
    client.manager.options.client.username = client.user.username;
    client.manager.init(client.user.id);
  });

  client.on("raw", (d) => client.manager.sendRawData(d));
  require('./events/lavaEvents/lavaEvents.js')(client);
  const playCommand = require('./commands/music/play.js');
  const playnextCommand = require('./commands/music/playnext.js');
  client.commands = new Collection();
  client.commands.set('play', playCommand);
  client.commands.set('playnext', playnextCommand);
}

if (process.env.LAVALINK !== 'true') {
  throw new Error('You need to enable Lavalink for the bot to work. Please set LAVALINK=true in your environment variables.');
}

client.totalTracksPlayed = 0;
client.playerType = 'lavalink';
client.userInteractions = new Map();
const interactionCleanupInterval = 60000; 

setInterval(() => {
  const now = Date.now();
  client.userInteractions.forEach((timestamp, userId) => {
    if (now - timestamp > 60000) { 
      client.userInteractions.delete(userId);
    }
  });
}, interactionCleanupInterval);
console.log("Player Type:",client.playerType);
require('./events/errors/handleErrors.js')(client);

if (process.env.TOP_GG) {
  client.topgg = new Topgg.Api(process.env.TOP_GG);
} else {
  console.log("Top.gg Disabled")
}
const ytiClient = new YTIClient();
client.ytiClient = ytiClient;

new CommandHandler({
  client,
  commandsPath: path.join(__dirname, 'commands'),
  eventsPath: path.join(__dirname, 'events'),
  //testServer: process.env.GUILD_ID,
});


(async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB.");
    if (process.env.DEBUG === 'true') {
      console.debug('[Bot] Initializing cluster client:', {
        clusterId: process.env.CLUSTER_ID,
        shardList: getInfo().SHARD_LIST,
        totalShards: getInfo().TOTAL_SHARDS
      });
    }
    
    client.cluster = new ClusterClient(client);
    
    if (process.env.DEBUG === 'true') {
      console.debug('[Bot] Cluster client initialized:', {
        clusterId: client.cluster?.id,
        hasCluster: !!client.cluster
      });
    }

    // Start the analytics processor on all clusters.
    // The processor will handle its role (main/secondary) internally.
    const { startAnalyticsProcessor } = require('./utils/cacheManager');
    if (process.env.DEBUG === 'true') {
      console.debug('[Bot] Starting analytics processor');
    }
    startAnalyticsProcessor(AnalyticsModel);
    require('./events/giveawayEvents/checkGiveaway.js')(client);
    client.login(process.env.TOKEN); 
  } catch (error) {
    console.log(`Error: ${error}`);
  }
})();

process.on('message', (message) => {
  if (!message || typeof message !== 'object') return;

  if (process.env.DEBUG === 'true') {
    console.debug('[Bot] Received IPC message:', {
      messageType: message.type,
      clusterId: client.cluster?.id,
      isMainCluster: client.cluster?.id === 0,
      messageKeys: Object.keys(message)
    });
  }

  // Handle analytics data sync from secondary clusters to the main cluster
  if (message.type === 'ANALYTICS_SYNC_IPC' && client.cluster && client.cluster.id === 0) {
    if (process.env.DEBUG === 'true') {
      console.debug('[Bot] Processing analytics sync IPC message');
    }
    cacheManager.handleIncomingAnalyticsUpdate(message.data);
  }

});

module.exports = client;
