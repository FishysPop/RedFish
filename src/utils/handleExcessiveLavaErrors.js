const { migratePlayerNode } = require('./nodeFallbackHelper');

module.exports = async (player, manager) => {
    try {
        if (!player || !player.node) return false;
        const node = player.node;
        const nodeId = node.id || node.options?.id || 'Unknown';
        const debugEnabled = process.env.DEBUG === 'true'; 

        if (debugEnabled) {
            console.debug(`[DEBUG] Checking node ${nodeId} for excessive errors.`);
        }

        if (node.isDisconnecting) {
            if (debugEnabled) {
                console.debug(`[DEBUG] Node ${nodeId} is already disconnecting. Skipping.`);
            }
            return false;
        }

        const now = Date.now();
        const cutoff = now - 900000; 
        const nodes = Array.from(manager.nodeManager.nodes.values());

        const availableNodes = nodes.filter(
            (n) => n.id !== nodeId && n.connected && !n.isDisconnecting 
        );
        if (debugEnabled) {
            console.debug(`[DEBUG] Node ${nodeId} - Available fallback nodes:`, availableNodes.map(n => n.id));
        }

        if (!node.errors) {
            node.errors = [];
        }

        node.errors.push(now);
        node.errors = node.errors.filter((timestamp) => timestamp >= cutoff);

        if (debugEnabled) {
            console.debug(`[DEBUG] Node ${nodeId} - Error count within 15 minutes: ${node.errors.length}`);
        }

        if (node.errors.length > 10) {
            node.isDisconnecting = true;
            console.warn(`[Lavalink] Removing Lavalink node ${nodeId} due to excessive errors (${node.errors.length} in 15m).`);

            if (availableNodes.length > 0) {
                const targetNode = availableNodes[0];
                if (debugEnabled) {
                    console.debug(`[DEBUG] Node ${nodeId} - Moving players to fallback node: ${targetNode.id}`);
                }
                for (const p of manager.players.values()) {
                    if (p.node?.id === nodeId) {
                        try {
                            await migratePlayerNode(p, targetNode, manager?.client);
                        } catch (moveError) {
                            console.error(`Failed to move player for guild ${p.guildId} from ${nodeId} to ${targetNode.id}:`, moveError);
                        }
                    }
                }
            }
            
            try {
                if (typeof manager.nodeManager.disconnectNode === 'function') {
                    await manager.nodeManager.disconnectNode(nodeId);
                } else if (typeof node.destroy === 'function') {
                    await node.destroy();
                }
            } catch (dcError) {
                console.error(`Error disconnecting node ${nodeId}:`, dcError);
            }
            return true;
        }

        return false;
    } catch (error) {
        console.error('Failed to handle excessive Lavalink errors:', error);
        return false;
    }
};
