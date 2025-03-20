module.exports = async (player, manager) => {
    try {
        const node = player.node;
        const nodeName = player.node.name;
        const debugEnabled = process.env.DEBUG === 'true'; // Check if debug is enabled

        if (debugEnabled) {
            console.debug(`[DEBUG] Checking node ${nodeName} for excessive errors.`);
        }

        if (node.isDisconnecting) {
            if (debugEnabled) {
                console.debug(`[DEBUG] Node ${nodeName} is already disconnecting. Skipping.`);
            }
            return false;
        }
        node.isDisconnecting = true;

        const now = Date.now();
        const cutoff = now - 900000; // 15 minutes
        const nodes = manager.shoukaku.nodes;
        const nodesArray = Array.from(nodes);

        const availableNodes = nodesArray.filter(
            (node) => node.name !== nodeName && node.state === 2 && !node.isDisconnecting
        );

        if (debugEnabled) {
            console.debug(`[DEBUG] Node ${nodeName} - Available nodes:`, availableNodes.map(n => n.name));
        }

        if (!node.errors) {
            node.errors = [];
        }

        node.errors.push(now);
        node.errors = node.errors.filter((timestamp) => timestamp >= cutoff);

        if (debugEnabled) {
            console.debug(`[DEBUG] Node ${nodeName} - Error count within 15 minutes: ${node.errors.length}`);
        }

        if (node.errors.length > 10) {
            console.warn(`Removing Lavalink node ${nodeName} due to excessive errors.`);

            if (debugEnabled) {
                console.debug(`[DEBUG] Node ${nodeName} - Excessive errors detected. Attempting to move players.`);
            }

            if (availableNodes.length > 0 && node.state === 2) {
                const targetNode = availableNodes[0];
                if (debugEnabled) {
                    console.debug(`[DEBUG] Node ${nodeName} - Moving players to node: ${targetNode.name}`);
                }
                for (const player of manager.players.values()) {
                    if (player.node.name === nodeName) {
                        try {
                            if (debugEnabled) {
                                console.debug(`[DEBUG] Node ${nodeName} - Moving player ${player.connection.guildId} to ${targetNode.name}`);
                            }
                            await player.shoukaku.move(targetNode.name);
                            if (debugEnabled) {
                                console.debug(`[DEBUG] Node ${nodeName} - Moved player ${player.connection.guildId} to ${targetNode.name} successfully.`);
                            }
                        } catch (moveError) {
                            console.error(`Failed to move player ${player.connection.guildId}:`, moveError);
                        }
                    }
                }
                setTimeout(() => {
                    if (debugEnabled) {
                        console.debug(`[DEBUG] Node ${nodeName} - Disconnecting node after player move.`);
                    }
                    node.disconnect(5, 'Node disconnected by command');
                    node.ws.close();
                }, 5000);
            } else {
                if (debugEnabled) {
                    console.debug(`[DEBUG] Node ${nodeName} - No available nodes to move players to.`);
                }
            }
            if (debugEnabled) {
                console.debug(`[DEBUG] Node ${nodeName} - Removing node from Shoukaku.`);
            }
            await manager.shoukaku.removeNode(nodeName, "Excessive errors detected.");
            return true;
        }

        if (debugEnabled) {
            console.debug(`[DEBUG] Node ${nodeName} - No excessive errors detected.`);
        }
        return false;
    } catch (error) {
        console.error('Failed to handle excessive Lavalink errors:', error);
        return false;
    }
};
