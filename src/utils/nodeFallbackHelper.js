const nodeSourceMap = {
    deezer: ["dzsearch", "deezer"],
    qobuz: ["qbsearch", "qobuz"],
    spotify: ["spsearch", "spotify"],
    applemusic: ["amsearch", "applemusic", "apple"],
    jiosaavn: ["jiosaavnsearch", "jiosaavn"],
    yandexmusic: ["ymsearch", "yandexmusic", "yandex"],
    youtube: ["ytsearch", "youtube"],
    youtubemusic: ["ytmsearch", "youtubemusic"],
    soundcloud: ["scsearch", "soundcloud"]
};

function isSourceSupportedByNode(node, source) {
    if (!node || !node.connected) return false;

    const info = node.info;
    const targetSource = source.toLowerCase().replace(":", "");
    const possibleNames = nodeSourceMap[targetSource] || [targetSource];

    if (info && Array.isArray(info.sourceManagers) && info.sourceManagers.length > 0) {
        const supported = info.sourceManagers.map(s => s.toLowerCase());
        const hasSourceManager = possibleNames.some(name => supported.includes(name));
        if (hasSourceManager) return true;
    }

    if (info && Array.isArray(info.plugins) && info.plugins.length > 0) {
        const hasLavaSrc = info.plugins.some(p => p.name.toLowerCase().includes("lavasrc"));
        if (hasLavaSrc && ["deezer", "qobuz", "spotify", "applemusic", "jiosaavn", "yandexmusic", "dzsearch", "qbsearch", "spsearch", "amsearch"].includes(targetSource)) {
            return true;
        }
    }

    if (!info || !info.sourceManagers) {
        return true; 
    }

    return false;
}

function findBestNodeForSource(manager, targetSource, preferredNodeId = null) {
    if (!manager || !manager.nodeManager) return null;
    const nodes = Array.from(manager.nodeManager.nodes.values()).filter(n => n.connected);
    if (nodes.length === 0) return null;

    if (preferredNodeId) {
        const prefNode = nodes.find(n => n.id === preferredNodeId);
        if (prefNode && isSourceSupportedByNode(prefNode, targetSource)) {
            return prefNode;
        }
    }

    const matchingNode = nodes.find(n => isSourceSupportedByNode(n, targetSource));
    if (matchingNode) return matchingNode;

    return nodes[0];
}

async function searchWithNodeFallback(player, queryOrOptions, requester, targetSource) {
    const manager = player.lavalink || player.manager;
    const bestNode = findBestNodeForSource(manager, targetSource, player.node?.id);

    let searchOptions = typeof queryOrOptions === 'string' ? { query: queryOrOptions } : { ...queryOrOptions };
    if (requester) searchOptions.requester = requester;

    if (targetSource === 'deezer') searchOptions.source = 'dzsearch';
    else if (targetSource === 'qobuz') searchOptions.source = 'qbsearch';
    else if (targetSource === 'spotify') searchOptions.source = 'spsearch';
    else if (targetSource === 'applemusic') searchOptions.source = 'amsearch';
    else if (targetSource === 'youtube') searchOptions.source = 'ytsearch';
    else if (targetSource === 'youtube_music') searchOptions.source = 'ytmsearch';
    else if (targetSource === 'soundcloud') searchOptions.source = 'scsearch';
    else if (targetSource) searchOptions.source = targetSource;

    if (bestNode && bestNode.id !== player.node?.id) {
        searchOptions.node = bestNode;
    }

    let res = await player.search(searchOptions, requester).catch(err => {
        console.warn(`[NodeFallback] Primary search on source '${targetSource}' failed:`, err.message);
        return null;
    });

    if (res && res.tracks && res.tracks.length > 0) {
        return res;
    }

    console.log(`[NodeFallback] Source '${targetSource}' returned no tracks. Falling back to ytmsearch.`);
    searchOptions.source = 'ytmsearch';
    delete searchOptions.node;

    res = await player.search(searchOptions, requester).catch(() => null);
    return res;
}

module.exports = {
    isSourceSupportedByNode,
    findBestNodeForSource,
    searchWithNodeFallback
};
