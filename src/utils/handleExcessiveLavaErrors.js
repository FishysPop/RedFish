module.exports = async (player, manager) => {
    try {
    const node = player.node;
    const nodeName = player.node.name;

    if (node.isDisconnecting) { 
        return false; 
    }
    node.isDisconnecting = true;  

    const now = Date.now();
    const cutoff = now - 900000; 
    const nodes = manager.shoukaku.nodes;
    const nodesArray = Array.from(nodes);

    const availableNodes = nodesArray.filter(node => node.name !== nodeName && node.state === 2 && !node.isDisconnecting);

    if (!node.errors) {
        node.errors = [];
    }

    node.errors.push(now);
    node.errors = node.errors.filter((timestamp) => timestamp >= cutoff);

    if (node.errors.length > 15) { 
        console.warn(`Removing Lavalink node ${nodeName} due to excessive errors.`);

        if (availableNodes.length > 0 && node.state === 2) { 
            const targetNode = availableNodes[0]; 
            for (const player of manager.players.values()) {
                if (player.node.name === nodeName) {
                    try {
                        await player.shoukaku.move(targetNode.name);

                    } catch (moveError) {
                        console.error('Failed to move player:', moveError);
                    }
                }
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

