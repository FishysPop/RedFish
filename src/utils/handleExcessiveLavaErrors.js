module.exports = async (player, manager) => {
    try {
    const node = player.node;
    const nodeName = player.node.name;
    const now = Date.now();
    const cutoff = now - 900000; 
    const nodes = manager.shoukaku.nodes;
    const nodesArray = Array.from(nodes);

    const availableNodes = nodesArray.filter(  ([, node]) => node.name !== nodeName && node.state === 2);
    const targetNode = availableNodes[0][1]; 

    if (!node.errors) {
        node.errors = [];
    }

    node.errors.push(now);
    node.errors = node.errors.filter((timestamp) => timestamp >= cutoff);

    if (node.errors.length > 15) { 
        
        console.warn(`Removing Lavalink node ${nodeName} due to excessive errors.`);
        if (node && node.state === 2) {
            if (availableNodes.length === 0) {
            manager.players.forEach(async (player) => {
                if (player.node.name === nodeName) {
                    try {
                        await player.shoukaku.move(targetNode.name); 
                    } catch (moveError) {
                        console.error('Failed to move player:', moveError);
                    }
                }
            });
        } 
            setTimeout(() => {
                node.disconnect(5, 'Node disconnected by command');
                node.ws.close();
            }, 5000); 
          }
        await manager.shoukaku.removeNode(nodeName, "Excessive errors detected."); 
        return true;
    }

    return false; 
} catch (error) {
    console.error('Failed to handle excessive Lavalink errors:', error);
    return false; 
}
};

