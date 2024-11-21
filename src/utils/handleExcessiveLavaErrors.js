module.exports = async (player, manager) => {
    const node = player.node;
    const nodeName = player.node.name;
    const now = Date.now();
    const cutoff = now - 1800000; // 30 minutes in milliseconds

    if (!node.errors) {
        node.errors = [];
    }

    node.errors.push(now);
    node.errors = node.errors.filter((timestamp) => timestamp >= cutoff);

    if (node.errors.length > 2) { 
        console.warn(`Removing Lavalink node ${nodeName} due to excessive errors.`);
        manager.shoukaku.removeNode(nodeName, "Excessive errors detected."); 
        manager.players.forEach(async (player2) => {
            if (player2.shoukaku.node.name === nodeName) {
       const Lavaplayer = manager.players.get(player.guildId);
       await Lavaplayer.destroy();            }
        }); 
      // const Lavaplayer = manager.players.get(player.guildId);
     //  await Lavaplayer.destroy();


        await node.ws.close()
        await manager.shoukaku.removeNode(nodeName);
        console.log(manager.players)
        return true;
    }

    return false; 
};

