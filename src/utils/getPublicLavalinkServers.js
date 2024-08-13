const { Client, GatewayIntentBits } = require('discord.js');
const { Shoukaku, Connectors } = require("shoukaku");
const axios = require("axios")

require("dotenv").config();

const token = process.env.TOKEN;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        // Add any other intents your bot needs
    ],
});

const lavaNodes = []
const workingLavalinkNodes = []
const NoneRateLimitedNdoes = []

async function getPublicLavalinkServers() {
    const fileUrl = 'https://raw.githubusercontent.com/DarrenOfficial/lavalink-list/master/docs/NoSSL/lavalink-without-ssl.md';
    const response = await axios.get(fileUrl);
    const fileContent = response.data;

    // Regex pattern to match each section
    const regex = /```bash\nHost : (.*?)\nPort : (\d+)\nPassword : "(.*?)"\nSecure : (.*?)\n```/g;

    // Array to store the parsed objects
    let match;

    // Parse the file content
    while ((match = regex.exec(fileContent)) !== null) {
        lavaNodes.push({
            name: match[1].trim(),
            url: `${match[1].trim()}:${match[2].trim()}`,
            auth: match[3].trim(),
            secure: match[4].trim().toLowerCase() === 'true',
        });
    }

    // Log the parsed array
    console.log(lavaNodes);
}

// Fetch Lavalink servers before creating Kazagumo
(async () => {
  try {
    await getPublicLavalinkServers(); // Fetch Lavalink servers
    const lavaURI = process.env.LAVALINK_URI; 
    if (lavaURI) {
      const nodes = lavaURI.split(';');
      nodes.forEach((node, index) => {
        const [ip, portAndAuth] = node.split(':');
        if (portAndAuth) {
          const [port, password] = portAndAuth.split('@');
          // Check if the node already exists in lavaNodes
          const existingNode = lavaNodes.find(n => n.url === `${ip}:${port}`);
          if (!existingNode) {
            lavaNodes.push({
              name: `${ip}`,
              url: `${ip}:${port}`, 
              auth: password, 
              secure: false 
            });
          }
        } else {
          console.warn(`Invalid Lavalink node configuration: ${node}`);
        }
      });
    } else {
      console.warn('No Lavalink node configuration found in .env. eg LAVALINK_URI = YOUR_IP:PORT@PASSWORD');
    }

    client.manager = new Shoukaku(new Connectors.DiscordJS(client), lavaNodes);

    client.once('ready', async () => {
        try {
            console.log('Bot is ready!');
        } catch (error) {
            console.error('Error logging in:', error.message);
        }
    });
    client.manager.on('ready', (name) =>  {
        console.log(`Adding: ${name}!`);

        client.manager.nodes.forEach(async node => {
            if (node.name === name) {
                workingLavalinkNodes.push(node)
                const search = await node.rest.resolve("ytsearch:https://www.youtube.com/watch?v=C0DPdy98e4c")
                //console.log(search.data)
                if (search.data?.length) {
                  console.log(`Working: ${node.name} `)
                  NoneRateLimitedNdoes.push(node)
                } else {
                    console.log(`RateLimited: ${node.name}`)
                }
            }
        });
        
  });
    client.manager.on('error', (name, error) => {
      //   console.error(`Lavalink ${name}: Error Caught,`, error)
     });
    client.manager.on('close', (name, code, reason) => {
       // console.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`)
        client.manager.removeNode(name)
        console.log(`Removing node: ${name}`)
    });
  //  client.manager.shoukaku.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug,`, info));
    client.manager.on('disconnect', (name, players, moved) => {
    if (moved) return;
    try {
    players.map(player => player.connection.disconnect())
    console.warn(`Lavalink ${name}: Disconnected`);
  } catch (error) {   
  }
});

    client.login(token);
  } catch (error) {
    console.error('Error fetching Lavalink servers:', error.message);
  }
})();
setTimeout(() => {
    const workingNodesString = workingLavalinkNodes.map(node => `${node.url}@${node.auth}`).join(';');
    console.log("Working lavalink servers:")
    console.log(workingNodesString.replace(/ws:\/\//g, ''))
    const workingNonRatedLimitedNodesString = NoneRateLimitedNdoes.map(node => `${node.url}@${node.auth}`).join(';');
    console.log("")
    console.log("Working lavalink servers with youtube working:")
    console.log(workingNonRatedLimitedNodesString.replace(/ws:\/\//g, ''))
  }, 10000)

process.on('unhandledRejection', async (reason, promise) => {
    console.log("unhandled rejection at:", promise, 'reason:', reason);
    try {
    if (reason instanceof DiscordAPIError && reason.code === 50001) {
        console.log("Error occurred due to Missing Access.");
        
        // Extracting relevant information for the request
        const requestBody = reason.requestBody;
        const embeds = requestBody?.json?.embeds;
        const content = requestBody?.json?.content;

        console.log("Embeds:", embeds);
        console.log("Content:", content);
    }
} catch (error) {
return;            
}
});


process.on('uncaughtException', (err) => {
console.log("Uncaught Exception:", err);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
console.log("Uncaught Exception Monitor:", err, origin);
});

process.on('rejectionHandled', (err) => {
console.log("rejected handled:", err);
})

process.on('warning', (warning) => {
console.log("Warning:", warning);
})

