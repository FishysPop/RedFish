const path = require('path');
const { getAvailableNodes, migratePlayerNode } = require('./nodeFallbackHelper');

let proberInterval = null;

function isRateLimitError(err) {
    if (!err) return false;
    const msg = (typeof err === 'string' ? err : (err.message || String(err))).toLowerCase();

    if (
        msg.includes('blocked due to the claimed content') ||
        msg.includes('copyright') ||
        msg.includes('this video is private') ||
        msg.includes('content warning') ||
        msg.includes('not available in your country') ||
        msg.includes('who has blocked it on copyright grounds')
    ) {
        return false;
    }

    return (
        msg.includes('429') ||
        msg.includes('too many requests') ||
        msg.includes('this video requires login') ||
        msg.includes('sign in to confirm') ||
        msg.includes('not success status code: 403') ||
        msg.includes('video player configuration error') ||
        msg.includes('invalid status code for player api response: 400') ||
        msg.includes('all clients failed to load the item') ||
        msg.includes('the page needs to be reloaded')
    );
}

const INITIAL_PROBE_BACKOFF_MS = 60 * 1000;
const MAX_PROBE_BACKOFF_MS = 6 * 60 * 60 * 1000;
const PROBE_BACKOFF_FACTOR = 2;

function calculateProbeBackoff(failedAttempts = 0, initialMs = INITIAL_PROBE_BACKOFF_MS, maxMs = MAX_PROBE_BACKOFF_MS) {
    if (failedAttempts <= 0) return initialMs;
    const backoff = initialMs * Math.pow(PROBE_BACKOFF_FACTOR, failedAttempts);
    return Math.min(backoff, maxMs);
}

function recordFailedProbe(node, initialMs = INITIAL_PROBE_BACKOFF_MS, maxMs = MAX_PROBE_BACKOFF_MS) {
    node.failedProbeAttempts = (node.failedProbeAttempts || 0) + 1;
    const backoff = calculateProbeBackoff(node.failedProbeAttempts, initialMs, maxMs);
    node.currentProbeBackoffMs = backoff;
    node.nextProbeAt = Date.now() + backoff;
    return backoff;
}

function getClusterId(client) {
    if (client?.cluster?.id !== undefined) return Number(client.cluster.id);
    if (process.env.CLUSTER !== undefined) return Number(process.env.CLUSTER);
    return 0;
}

async function broadcastNodeSync(client, action, nodeId, reason) {
    if (!client?.cluster || typeof client.cluster.broadcastEval !== 'function') return;
    try {
        await client.cluster.broadcastEval(
            async (c, { action, targetNodeId, targetReason }) => {
                const helperPath = require('path').join(process.cwd(), 'src', 'utils', 'handleExcessiveLavaErrors');
                const demotion = require(helperPath);
                if (c.manager) {
                    if (action === 'demote') {
                        await demotion.demoteNode(c.manager, targetNodeId, targetReason, true);
                    } else if (action === 'promote') {
                        await demotion.promoteNode(c.manager, targetNodeId, true);
                    }
                }
            },
            { context: { action, targetNodeId: nodeId, targetReason: reason } }
        );
    } catch (err) {
        if (process.env.DEBUG === 'true') {
            console.warn(`[Lavalink Demotion Sync] Failed to broadcast ${action} for node ${nodeId}:`, err.message);
        }
    }
}

async function demoteNode(manager, nodeId, reason = 'Excessive errors', isSync = false) {
    if (!manager?.nodeManager?.nodes) return false;
    const node = manager.nodeManager.nodes.get(nodeId);
    if (!node || node.isDemoted) return false;

    node.isDemoted = true;
    node.demotedAt = Date.now();
    node.demoteReason = reason;
    node.consecutiveProbeSuccesses = 0;
    node.failedProbeAttempts = 0;
    node.currentProbeBackoffMs = INITIAL_PROBE_BACKOFF_MS;
    node.nextProbeAt = Date.now() + INITIAL_PROBE_BACKOFF_MS;

    const discordClient = manager?.client || manager?.options?.clientInstance;
    const clusterId = getClusterId(discordClient);

    if (!isSync) {
        console.warn(`[Lavalink Demotion] [Cluster ${clusterId}] Demoting node ${nodeId}. Reason: ${reason}`);
    } else if (process.env.DEBUG === 'true') {
        console.debug(`[Lavalink Demotion Sync] [Cluster ${clusterId}] Demoting node ${nodeId} from sync. Reason: ${reason}`);
    }

    const availableNodes = getAvailableNodes(manager, nodeId);
    if (availableNodes.length > 0 && manager.players) {
        const targetNode = availableNodes[0];
        for (const p of manager.players.values()) {
            if (p.node?.id === nodeId) {
                try {
                    await migratePlayerNode(p, targetNode, discordClient);
                } catch (moveError) {
                    console.error(`[Lavalink Demotion] [Cluster ${clusterId}] Failed to migrate player for guild ${p.guildId} to ${targetNode.id}:`, moveError);
                }
            }
        }
    }

    if (!isSync && discordClient) {
        await broadcastNodeSync(discordClient, 'demote', nodeId, reason);
    }

    return true;
}

async function promoteNode(manager, nodeId, isSync = false) {
    if (!manager?.nodeManager?.nodes) return false;
    const node = manager.nodeManager.nodes.get(nodeId);
    if (!node || !node.isDemoted) return false;

    node.isDemoted = false;
    node.demotedAt = null;
    node.demoteReason = null;
    node.lastFailedTrack = null;
    node.errors = [];
    node.consecutiveProbeSuccesses = 0;
    node.failedProbeAttempts = 0;
    node.currentProbeBackoffMs = 0;
    node.nextProbeAt = null;

    const discordClient = manager?.client || manager?.options?.clientInstance;
    const clusterId = getClusterId(discordClient);

    if (!isSync) {
        console.log(`[Lavalink Demotion] [Cluster ${clusterId}] Node ${nodeId} restored and re-promoted back to active pool.`);
    } else if (process.env.DEBUG === 'true') {
        console.debug(`[Lavalink Demotion Sync] [Cluster ${clusterId}] Node ${nodeId} restored from sync.`);
    }

    if (!isSync && discordClient) {
        await broadcastNodeSync(discordClient, 'promote', nodeId);
    }

    return true;
}

async function probeNodeHealth(node, options = {}) {
    if (!node || !node.connected) {
        return { healthy: false, isRateLimited: false, reason: 'Node disconnected' };
    }

    try {
        if (typeof node.fetchInfo === 'function') {
            await node.fetchInfo();
        } else if (typeof node.request === 'function') {
            await node.request('/stats');
        }
    } catch (restErr) {
        return { healthy: false, isRateLimited: false, reason: `REST health check failed: ${restErr.message}` };
    }

    let testTarget = options.testTrackUrl || null;

    const trackCandidate = options.track || node.lastFailedTrack;
    if (!testTarget && trackCandidate) {
        if (trackCandidate.info?.uri) {
            testTarget = trackCandidate.info.uri;
        } else if (trackCandidate.info?.title) {
            testTarget = `ytsearch:${trackCandidate.info.title}`;
        } else if (trackCandidate.encoded && typeof node.decodeTrack === 'function') {
            try {
                const decoded = await node.decodeTrack(trackCandidate.encoded);
                testTarget = decoded?.info?.uri || (decoded?.info?.title ? `ytsearch:${decoded.info.title}` : null);
            } catch {}
        }
    }

    if (!testTarget) {
        testTarget = 'ytsearch:popular hits';
    }

    try {
        let searchResult = null;
        if (typeof node.search === 'function') {
            const isDirectUrl = testTarget.startsWith('http://') || testTarget.startsWith('https://');
            const searchOpts = isDirectUrl ? { query: testTarget } : { query: testTarget, source: 'ytsearch' };
            searchResult = await node.search(searchOpts);
        } else if (typeof node.loadTracks === 'function') {
            searchResult = await node.loadTracks(testTarget);
        }

        if (!searchResult || searchResult.loadType === 'error') {
            const errorMsg = searchResult?.data?.message || searchResult?.exception?.message || 'Search returned error loadType';
            return {
                healthy: false,
                isRateLimited: isRateLimitError(errorMsg),
                reason: errorMsg
            };
        }

        const tracks = searchResult.tracks || [];
        if (!tracks.length || !tracks[0]?.encoded) {
            return {
                healthy: false,
                isRateLimited: false,
                reason: 'No playable tracks resolved'
            };
        }

        encoded = tracks[0].encoded;
    } catch (searchErr) {
        return {
            healthy: false,
            isRateLimited: isRateLimitError(searchErr),
            reason: `Track resolution failed: ${searchErr.message || searchErr}`
        };
    }

    const playbackDurationMs = typeof options.playbackDurationMs === 'number' ? options.playbackDurationMs : 3000;
    const probeGuildId = options.probeGuildId || '999999999999999999';
    let playbackException = null;

    const rawHandler = (n, payload) => {
        if (n?.id && n.id !== node.id) return;
        if (payload?.op === 'event' && String(payload.guildId) === probeGuildId) {
            if (payload.type === 'TrackExceptionEvent') {
                playbackException = payload.exception?.message || 'TrackExceptionEvent received';
            }
        }
    };

    const wsHandler = (data) => {
        try {
            const payload = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());
            if (payload.op === 'event' && String(payload.guildId) === probeGuildId) {
                if (payload.type === 'TrackExceptionEvent') {
                    playbackException = payload.exception?.message || 'TrackExceptionEvent received';
                }
            }
        } catch {}
    };

    if (node.socket && typeof node.socket.on === 'function') {
        node.socket.on('message', wsHandler);
    }
    if (node.NodeManager && typeof node.NodeManager.on === 'function') {
        node.NodeManager.on('raw', rawHandler);
    }

    try {
        if (typeof node.updatePlayer === 'function') {
            await node.updatePlayer({
                guildId: probeGuildId,
                playerOptions: { track: { encoded } }
            });
        } else if (node.sessionId && typeof node.request === 'function') {
            await node.request(`/sessions/${node.sessionId}/players/${probeGuildId}`, (r) => {
                r.method = 'PATCH';
                r.headers['Content-Type'] = 'application/json';
                r.body = JSON.stringify({ track: { encoded } });
            });
        }

        if (playbackDurationMs > 0) {
            const checkInterval = 100;
            let elapsed = 0;
            while (elapsed < playbackDurationMs) {
                if (playbackException) break;
                await new Promise((r) => setTimeout(r, Math.min(checkInterval, playbackDurationMs - elapsed)));
                elapsed += checkInterval;
            }
        }

        if (playbackException) {
            return {
                healthy: false,
                isRateLimited: isRateLimitError(playbackException),
                reason: `Playback exception: ${playbackException}`
            };
        }

        return { healthy: true, isRateLimited: false };
    } catch (playErr) {
        return {
            healthy: false,
            isRateLimited: isRateLimitError(playErr),
            reason: `Playback update error: ${playErr.message || playErr}`
        };
    } finally {
        if (node.socket && typeof node.socket.off === 'function') {
            node.socket.off('message', wsHandler);
        } else if (node.socket && typeof node.socket.removeListener === 'function') {
            node.socket.removeListener('message', wsHandler);
        }

        if (node.NodeManager && typeof node.NodeManager.off === 'function') {
            node.NodeManager.off('raw', rawHandler);
        } else if (node.NodeManager && typeof node.NodeManager.removeListener === 'function') {
            node.NodeManager.removeListener('raw', rawHandler);
        }

        if (typeof node.destroyPlayer === 'function') {
            await node.destroyPlayer(probeGuildId).catch(() => {});
        } else if (node.sessionId && typeof node.request === 'function') {
            await node.request(`/sessions/${node.sessionId}/players/${probeGuildId}`, (r) => {
                r.method = 'DELETE';
            }).catch(() => {});
        }
    }
}

function startDemotedNodeProber(client, options = {}) {
    const clusterId = getClusterId(client);
    if (clusterId !== 0) return;

    if (proberInterval) return;

    const intervalMs = typeof options.intervalMs === 'number' ? options.intervalMs : 15000;
    const requiredSuccesses = typeof options.requiredSuccesses === 'number' ? options.requiredSuccesses : 2;

    proberInterval = setInterval(async () => {
        try {
            if (!client?.manager?.nodeManager?.nodes) return;
            const nodes = Array.from(client.manager.nodeManager.nodes.values());
            for (const node of nodes) {
                if (!node.isDemoted) continue;

                const now = Date.now();
                if (node.nextProbeAt && now < node.nextProbeAt) continue;

                const probeResult = await probeNodeHealth(node, {
                    playbackDurationMs: options.playbackDurationMs,
                    testTrackUrl: options.testTrackUrl
                });
                if (probeResult.healthy) {
                    node.consecutiveProbeSuccesses = (node.consecutiveProbeSuccesses || 0) + 1;
                    if (node.consecutiveProbeSuccesses >= requiredSuccesses) {
                        await promoteNode(client.manager, node.id, false);
                    } else {
                        node.nextProbeAt = Date.now() + 15000;
                    }
                } else {
                    node.consecutiveProbeSuccesses = 0;
                    const nextBackoff = recordFailedProbe(node);
                    const delayMinutes = (nextBackoff / 60000).toFixed(1);
                    console.warn(`[Lavalink Prober] [Cluster ${clusterId}] Node ${node.id} probe failed (${probeResult.reason}). Next probe in ${delayMinutes}m (attempt ${node.failedProbeAttempts}, max 6h).`);
                }
            }
        } catch (intervalErr) {
            console.error(`[Lavalink Prober] [Cluster ${clusterId}] Error during probe cycle:`, intervalErr);
        }
    }, intervalMs);

    if (typeof proberInterval?.unref === 'function') {
        proberInterval.unref();
    }
}

function stopDemotedNodeProber() {
    if (proberInterval) {
        clearInterval(proberInterval);
        proberInterval = null;
    }
}

function isProberRunning() {
    return Boolean(proberInterval);
}

async function syncDemotedNodesFromCluster0(client) {
    const clusterId = getClusterId(client);
    if (clusterId === 0 || !client?.cluster || typeof client.cluster.broadcastEval !== 'function') return;

    try {
        const demotedStates = await client.cluster.broadcastEval((c) => {
            if (c.cluster?.id !== 0 || !c.manager?.nodeManager?.nodes) return null;
            const demoted = [];
            for (const node of c.manager.nodeManager.nodes.values()) {
                if (node.isDemoted) {
                    demoted.push({ id: node.id, reason: node.demoteReason });
                }
            }
            return demoted;
        });

        const cluster0Demoted = demotedStates.find(Array.isArray);
        if (cluster0Demoted && cluster0Demoted.length > 0 && client.manager) {
            for (const { id, reason } of cluster0Demoted) {
                await demoteNode(client.manager, id, reason, true);
            }
        }
    } catch (err) {
        if (process.env.DEBUG === 'true') {
            console.warn(`[Lavalink Demotion Sync] [Cluster ${clusterId}] Error syncing demoted nodes from cluster 0:`, err.message);
        }
    }
}

async function handleExcessiveLavaErrors(player, manager, options = {}) {
    try {
        if (!player || !player.node) return false;
        const node = player.node;
        const nodeId = node.id || node.options?.id || 'Unknown';

        if (node.isDemoted) return false;

        if (options.track) {
            node.lastFailedTrack = options.track;
        }

        if (options.reason || (options.error && isRateLimitError(options.error))) {
            const reason = options.reason || options.error?.message || 'Rate limit detected';
            return await demoteNode(manager, nodeId, reason);
        }

        const now = Date.now();
        const cutoff = now - 900000;

        if (!node.errors) {
            node.errors = [];
        }

        node.errors.push(now);
        node.errors = node.errors.filter((timestamp) => timestamp >= cutoff);

        if (node.errors.length > 10) {
            const reason = `Excessive errors (${node.errors.length} in 15m)`;
            return await demoteNode(manager, nodeId, reason);
        }

        return false;
    } catch (error) {
        console.error('Failed to handle excessive Lavalink errors:', error);
        return false;
    }
}

handleExcessiveLavaErrors.handleExcessiveLavaErrors = handleExcessiveLavaErrors;
handleExcessiveLavaErrors.demoteNode = demoteNode;
handleExcessiveLavaErrors.promoteNode = promoteNode;
handleExcessiveLavaErrors.probeNodeHealth = probeNodeHealth;
handleExcessiveLavaErrors.startDemotedNodeProber = startDemotedNodeProber;
handleExcessiveLavaErrors.stopDemotedNodeProber = stopDemotedNodeProber;
handleExcessiveLavaErrors.isProberRunning = isProberRunning;
handleExcessiveLavaErrors.syncDemotedNodesFromCluster0 = syncDemotedNodesFromCluster0;
handleExcessiveLavaErrors.isRateLimitError = isRateLimitError;
handleExcessiveLavaErrors.calculateProbeBackoff = calculateProbeBackoff;
handleExcessiveLavaErrors.recordFailedProbe = recordFailedProbe;
handleExcessiveLavaErrors.INITIAL_PROBE_BACKOFF_MS = INITIAL_PROBE_BACKOFF_MS;
handleExcessiveLavaErrors.MAX_PROBE_BACKOFF_MS = MAX_PROBE_BACKOFF_MS;
handleExcessiveLavaErrors.getClusterId = getClusterId;

module.exports = handleExcessiveLavaErrors;
