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

async function broadcastNodeSync(client, action, nodeId, reason) {
    if (!client?.cluster || typeof client.cluster.broadcastEval !== 'function') return;
    try {
        await client.cluster.broadcastEval(
            async (c, { action, targetNodeId, targetReason }) => {
                const demotion = require('./utils/handleExcessiveLavaErrors');
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
        console.warn(`[Lavalink Demotion Sync] Failed to broadcast ${action} for node ${nodeId}:`, err.message);
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

    console.warn(`[Lavalink Demotion] Demoting node ${nodeId}. Reason: ${reason}`);

    const discordClient = manager?.client || manager?.options?.clientInstance;
    const availableNodes = getAvailableNodes(manager, nodeId);
    if (availableNodes.length > 0 && manager.players) {
        const targetNode = availableNodes[0];
        for (const p of manager.players.values()) {
            if (p.node?.id === nodeId) {
                try {
                    await migratePlayerNode(p, targetNode, manager?.client);
                    await migratePlayerNode(p, targetNode, discordClient);
                } catch (moveError) {
                    console.error(`[Lavalink Demotion] Failed to migrate player for guild ${p.guildId} to ${targetNode.id}:`, moveError);
                }
            }
        }
    }

    if (!isSync && manager?.client) {
        await broadcastNodeSync(manager.client, 'demote', nodeId, reason);
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

    console.log(`[Lavalink Demotion] Node ${nodeId} restored and re-promoted back to active pool.`);

    if (!isSync && manager?.client) {
        await broadcastNodeSync(manager.client, 'promote', nodeId);
    const discordClient = manager?.client || manager?.options?.clientInstance;
    if (!isSync && discordClient) {
        await broadcastNodeSync(discordClient, 'promote', nodeId);
    }

    return true;
}

async function probeNodeHealth(node, options = {}) {
    if (!node || !node.connected) {
        return { healthy: false, isRateLimited: false, reason: 'Node disconnected' };
    }

    const playbackDurationMs = typeof options.playbackDurationMs === 'number' ? options.playbackDurationMs : 10000;

    try {
        if (typeof node.fetchInfo === 'function') {
            await node.fetchInfo();
        } else if (typeof node.request === 'function') {
            await node.request('/stats');
        }
    } catch (restErr) {
        return { healthy: false, isRateLimited: false, reason: `REST health check failed: ${restErr.message}` };
    }

    const testTargets = [];
    if (options.testTrackUrl) {
        testTargets.push({ query: options.testTrackUrl });
    } else if (node.lastFailedTrack) {
        if (node.lastFailedTrack.encoded) {
            testTargets.push({ track: node.lastFailedTrack });
        } else if (node.lastFailedTrack.info?.uri || node.lastFailedTrack.info?.title) {
            testTargets.push({ query: node.lastFailedTrack.info.uri || `ytsearch:${node.lastFailedTrack.info.title}` });
        }
    } else {
        testTargets.push({ query: 'ytsearch:My Jealousy' });
        testTargets.push({ query: 'ytsearch:popular hits' });
        testTargets.push({ query: 'ytsearch:NCS release' });
    }

    const probeGuildId = "999999999999999999";
    let playbackException = null;

    const wsHandler = (data) => {
        try {
            const payload = JSON.parse(data.toString());
            if (payload.op === 'event' && payload.type === 'TrackExceptionEvent' && String(payload.guildId) === probeGuildId) {
                playbackException = payload.exception?.message || 'TrackExceptionEvent received';
            }
        } catch {}
    };

    if (node.socket && typeof node.socket.on === 'function') {
        node.socket.on('message', wsHandler);
    }

    try {
        for (const target of testTargets) {
            if (playbackException) break;

            let encoded = null;
            if (target.track?.encoded) {
                encoded = target.track.encoded;
            } else if (target.query) {
                let searchResult = null;
                try {
                    if (typeof node.search === 'function') {
                        searchResult = await node.search({ query: target.query, source: 'ytsearch' });
                    } else if (typeof node.loadTracks === 'function') {
                        searchResult = await node.loadTracks(target.query);
                    }
                } catch (searchErr) {
                    playbackException = `Track resolution failed: ${searchErr.message}`;
                    break;
                }

                if (!searchResult || searchResult.loadType === 'error') {
                    playbackException = searchResult?.data?.message || 'Search returned error loadType';
                    break;
                }

                const tracks = searchResult.tracks || [];
                if (!tracks.length || !tracks[0]?.encoded) {
                    playbackException = 'No playable track resolved';
                    break;
                }
                encoded = tracks[0].encoded;
            }

            if (!encoded) {
                playbackException = 'No playable track resolved';
                break;
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
            } catch (patchErr) {
                playbackException = `Player update failed: ${patchErr.message}`;
                break;
            }

            const checkInterval = 200;
            let elapsed = 0;
            while (elapsed < playbackDurationMs) {
                if (playbackException) break;
                await new Promise(r => setTimeout(r, Math.min(checkInterval, playbackDurationMs - elapsed)));
                elapsed += checkInterval;
            }

            if (playbackException) break;
        }

        if (playbackException) {
            return {
                healthy: false,
                isRateLimited: isRateLimitError(playbackException),
                reason: playbackException.split('\n')[0].trim()
            };
        }

        return { healthy: true, isRateLimited: false };
    } catch (probeErr) {
        return {
            healthy: false,
            isRateLimited: isRateLimitError(probeErr),
            reason: `Playback probe error: ${probeErr.message}`
        };
    } finally {
        if (node.socket && typeof node.socket.off === 'function') {
            node.socket.off('message', wsHandler);
        } else if (node.socket && typeof node.socket.removeListener === 'function') {
            node.socket.removeListener('message', wsHandler);
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
    const isMainCluster = !client?.cluster || client.cluster.id === 0;
    if (!isMainCluster) return;
    const clusterId = client?.cluster?.id !== undefined
        ? client.cluster.id
        : (process.env.CLUSTER !== undefined ? Number(process.env.CLUSTER) : 0);

    if (clusterId !== 0) return;

    if (proberInterval) return;

    const intervalMs = typeof options.intervalMs === 'number' ? options.intervalMs : 15000;
    const requiredSuccesses = typeof options.requiredSuccesses === 'number' ? options.requiredSuccesses : 2;
    const playbackDurationMs = typeof options.playbackDurationMs === 'number' ? options.playbackDurationMs : 10000;

    proberInterval = setInterval(async () => {
        try {
            if (!client?.manager?.nodeManager?.nodes) return;
            const nodes = Array.from(client.manager.nodeManager.nodes.values());
            for (const node of nodes) {
                if (!node.isDemoted) continue;

                const now = Date.now();
                if (node.nextProbeAt && now < node.nextProbeAt) continue;

                const probeResult = await probeNodeHealth(node, { playbackDurationMs });
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
                    console.warn(`[Lavalink Prober] Node ${node.id} probe failed (${probeResult.reason}). Next probe in ${delayMinutes}m (attempt ${node.failedProbeAttempts}, max 6h).`);
                }
            }
        } catch (intervalErr) {
            console.error('[Lavalink Prober] Error during probe cycle:', intervalErr);
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
    const clusterId = client?.cluster?.id !== undefined
        ? client.cluster.id
        : (process.env.CLUSTER !== undefined ? Number(process.env.CLUSTER) : 0);

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
        console.warn('[Lavalink Demotion Sync] Error syncing demoted nodes from cluster 0:', err.message);
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

module.exports = handleExcessiveLavaErrors;
