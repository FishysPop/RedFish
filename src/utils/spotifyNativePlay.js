const WebSocket = require('ws');

// Global state for managing WebSocket jobs
// pendingSpotifyJobs: Maps a Spotify Track ID to its promise handlers and state.
// Key: spotifyTrackID, Value: { resolve, reject, jobId, timeoutId }
const pendingSpotifyJobs = new Map();

// jobToSpotifyIdMap: A reverse map to find a Spotify Track ID from a server-generated job ID.
// Key: jobID, Value: spotifyTrackID
const jobToSpotifyIdMap = new Map();
/**
 * Ensures a single, persistent WebSocket connection to the interactive endpoint.
 * @param {import("discord.js").Client} client The Discord client instance.
 * @param {boolean} debugEnabled - Whether debug logging is enabled.
 * @returns {Promise<WebSocket>} A promise that resolves with the WebSocket instance when it's ready.
 */
async function ensureInteractiveWebSocket(client, debugEnabled) {
    if (client.spotifyNativeWs && client.spotifyNativeWs.readyState === WebSocket.OPEN) {
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Interactive WebSocket already open.");
        return client.spotifyNativeWs;
    }

    if (client.spotifyNativeWsConnecting && client.spotifyNativeWsReadyPromise) {
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Interactive WebSocket already connecting. Waiting for existing promise.");
        return client.spotifyNativeWsReadyPromise;
    }
    client.spotifyNativeWsConnecting = true;
    client.spotifyNativeWsReadyPromise = new Promise((resolve, reject) => {
        const wsBaseUrl = process.env.SPOTIFY_NATIVE_STREAM_URL.replace(/^http/, 'ws');
        const wsUrl = new URL(`${wsBaseUrl}/ws/interactive`);

        if (process.env.SPOTIFY_NATIVE_STREAM_KEY) {
            wsUrl.searchParams.set('apiKey', process.env.SPOTIFY_NATIVE_STREAM_KEY);
        }

        if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Attempting to connect to interactive WebSocket: ${wsUrl.toString()}`);
        const ws = new WebSocket(wsUrl.toString());

        ws.onopen = () => { // Use onopen directly, not ws.on('open')
            if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Interactive WebSocket opened.");
            client.spotifyNativeWs = ws;
            client.spotifyNativeWsConnecting = false;
            resolve(ws);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data.toString());
                if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Interactive WS message received:", message);

                const { id: jobID, trackId: spotifyTrackID, status, fileUrl, error: errorMessage } = message;

                // Determine which job this message is for
                let jobPromise;
                let associatedSpotifyID = spotifyTrackID;

                if (!associatedSpotifyID && jobID) {
                    associatedSpotifyID = jobToSpotifyIdMap.get(jobID);
                }

                if (associatedSpotifyID) {
                    jobPromise = pendingSpotifyJobs.get(associatedSpotifyID);
                }

                if (jobPromise) {
                    // If this is the first time we see the jobID, map it for future lookups
                    if (jobID && !jobPromise.jobId) {
                        jobPromise.jobId = jobID;
                        jobToSpotifyIdMap.set(jobID, associatedSpotifyID);
                        if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Mapped jobID ${jobID} to Spotify track ${associatedSpotifyID}.`);
                    }

                    if (status === 'completed' && fileUrl) {
                        clearTimeout(jobPromise.timeoutId);
                        jobPromise.resolve(fileUrl);
                        pendingSpotifyJobs.delete(associatedSpotifyID);
                        if (jobPromise.jobId) jobToSpotifyIdMap.delete(jobPromise.jobId);
                    } else if (status === 'failed') {
                        clearTimeout(jobPromise.timeoutId);
                        jobPromise.reject(new Error(`Job ${jobID || 'unknown'} for track ${associatedSpotifyID} failed: ${errorMessage || 'Unknown error'}`));
                        pendingSpotifyJobs.delete(associatedSpotifyID);
                        if (jobPromise.jobId) jobToSpotifyIdMap.delete(jobPromise.jobId);
                    }
                    // Other statuses like 'processing' or 'queued' are ignored as we just wait for a final state.
                } else {
                    if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Received status for an unknown or already handled job. SpotifyID: ${spotifyTrackID}, JobID: ${jobID}`);
                }
            } catch (e) {
                console.error("[SpotifyNativePlay] Error parsing interactive WebSocket message:", e);
            }
        };

        ws.onerror = (error) => {
            console.error("[SpotifyNativePlay] Interactive WebSocket error:", error.message || error);
            if (client.spotifyNativeWsConnecting) { // If still connecting, reject the promise
                client.spotifyNativeWsConnecting = false;
                reject(new Error(`Interactive WebSocket connection failed: ${error.message || 'Unknown error'}`));
            }
        };

        ws.onclose = (event) => {
            if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Interactive WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
            client.spotifyNativeWs = null; 
            client.spotifyNativeWsConnecting = false;
            // Reject all pending promises because the connection is lost
            pendingSpotifyJobs.forEach((job, trackId) => {
                clearTimeout(job.timeoutId);
                job.reject(new Error("Interactive WebSocket closed unexpectedly."));
            });
            pendingSpotifyJobs.clear();
            jobToSpotifyIdMap.clear();
        };
    });

    return client.spotifyNativeWsReadyPromise;
}

/**
 * Attempts to get a direct stream from the SpotifyNativeStream API for a given URL.
 * @param {string} url The potential Spotify track URL.
 * @param {import("shoukaku").ShoukakuPlayer | import("discord-player").Player} player The player instance (Shoukaku or Discord-Player).
 * @param {import("discord.js").User} requester The user who requested the track.
 * @param {import("discord.js").Client} client The Discord client instance.
 * @returns {Promise<import("kazagumo").KazagumoSearchResult | null>} A Kazagumo search result with a modified track if successful, otherwise null.
 */
async function handleSpotifyNativePlay(url, player, requester, client, originalTrack = null, forceResolve = false) {
    const debugEnabled = process.env.DEBUG === 'true';
    if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Function called with URL: ${url}, forceResolve: ${forceResolve}`);

    if (!process.env.SPOTIFY_NATIVE_STREAM_URL) {
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Missing SPOTIFY_NATIVE_STREAM_URL environment variable. Exiting.");
        return null;
    }

    let urlObject;
    try {
        urlObject = new URL(url);
    } catch (e) {
        console.error(`[SpotifyNativePlay] Invalid URL: ${url}`, e);
        return null;
    }

    const isSpotifyTrack = urlObject.hostname === 'open.spotify.com' && urlObject.pathname.includes('/track/');
    const isSpotifyPlaylist = urlObject.hostname === 'open.spotify.com' && urlObject.pathname.includes('/playlist/');

    if (isSpotifyPlaylist) {
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Detected Spotify playlist. Handing off to playlist handler.");
        return handleSpotifyNativePlaylist(url, player, requester, client);
    }

    if (!isSpotifyTrack) {
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Not a Spotify track link. Exiting.");
        return null;
    }
    
    const reliableSpotifyTrackId = urlObject.pathname.split('/track/')[1];
    if (!reliableSpotifyTrackId || reliableSpotifyTrackId.length !== 22) {
        console.error(`[SpotifyNativePlay] Invalid Spotify Track ID found in URL: ${url}`);
        return null;
    }

    try {
        let spotifyTrack;
        if (originalTrack) {
            if (debugEnabled) console.debug('[SpotifyNativePlay-DEBUG] Using provided original track object.');
            spotifyTrack = originalTrack;
        } else {
            if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] No original track provided, searching for metadata for URL: ${url}`);
            const metadataResult = await player.search(url, { requester });
            if (!metadataResult || metadataResult.type !== 'TRACK' || !metadataResult.tracks.length) {
                if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Metadata search failed or returned no tracks. Exiting.", metadataResult);
                return null;
            }
            spotifyTrack = metadataResult.tracks[0];
        }
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Successfully retrieved metadata for:", spotifyTrack.title);

        // If the queue is long and we are not force-resolving, defer the expensive process.
        if (player.queue.size > 2 && !forceResolve) {
            if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Queue size is ${player.queue.size}. Deferring resolution for: ${spotifyTrack.title}`);
            spotifyTrack.spotifynative = "awaiting_resolve";
            return {
                tracks: [spotifyTrack],
                type: 'TRACK'
            };
        }

        const ws = await ensureInteractiveWebSocket(client, debugEnabled);

        const fileUrlPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const job = pendingSpotifyJobs.get(reliableSpotifyTrackId);
                if (job && job.jobId) {
                    jobToSpotifyIdMap.delete(job.jobId);
                }
                pendingSpotifyJobs.delete(reliableSpotifyTrackId);
                reject(new Error('Interactive WebSocket job status timed out after 15 seconds.'));
            }, 15000);

            pendingSpotifyJobs.set(reliableSpotifyTrackId, { resolve, reject, jobId: null, timeoutId });
        });

        const commandMessage = {
            command: "play",
            payload: {
                url: url
            }
        };
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Sending 'play' command over interactive WS:", commandMessage);
        ws.send(JSON.stringify(commandMessage));

        const fileUrl = await fileUrlPromise;

        if (fileUrl) {
            if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Resolving stream URL with Lavalink.`);
            const streamResult = await player.search(fileUrl, { requester });
            if (!streamResult || !streamResult.tracks.length) {
                console.error(`[SpotifyNativePlay] Lavalink could not resolve the stream URL: ${fileUrl}`);
                return null;
            }

            const playableTrack = streamResult.tracks[0];
            Object.assign(playableTrack, {
                title: spotifyTrack.title,
                author: spotifyTrack.author,
                length: spotifyTrack.length,
                thumbnail: spotifyTrack.thumbnail,
                uri: spotifyTrack.uri,
                sourceName: 'spotify_native',
                requester: requester,
            });
            playableTrack.spotifynative = 'resolved'; 

            streamResult.tracks[0] = playableTrack;
            streamResult.type = 'TRACK';
            console.log(`[SpotifyNativePlay] Successfully resolved track: ${playableTrack.uri}.`);

            if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Successfully created a resolved track with Spotify metadata. Returning result.`);
            return streamResult;
        }

        console.error("[SpotifyNativePlay] Stream URL was not resolved from WebSocket.");
        return null;
    } catch (apiError) {
        console.error("[SpotifyNativePlay] Error during native playback process:", apiError.message);
        if (apiError.message.includes('timed out') && client.spotifyNativeWs) {
            if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Timeout detected. Closing WebSocket.");
            client.spotifyNativeWs.close(1000, "Job timeout");
        }
        return null;
    }
}

/**
 * Handles the initial request for a Spotify playlist, queuing the first few tracks
 * and setting up the player for on-demand queuing of the rest.
 * @param {string} url The Spotify playlist URL.
 * @param {import("kazagumo").KazagumoPlayer} player The Kazagumo player instance.
 * @param {import("discord.js").User} requester The user who requested the playlist.
 * @param {import("discord.js").Client} client The Discord client instance.
 * @returns {Promise<{playlistName: string, tracks: any[]}|null>} An object with playlist details if successful, otherwise null.
 */
async function handleSpotifyNativePlaylist(url, player, requester, client) {
    const debugEnabled = process.env.DEBUG === 'true';
    if (debugEnabled) console.debug(`[SpotifyNativePlay-Playlist] Handling playlist URL: ${url}`);

    try {
        const playlistResult = await client.manager.search(url, { requester, engine: 'spotify' });

        if (!playlistResult || playlistResult.type !== 'PLAYLIST' || !playlistResult.tracks.length) {
            console.log(`[SpotifyNativePlay-Playlist] Could not resolve playlist from URL: ${url}`);
            return null;
        }

        const allTracks = [...playlistResult.tracks];
        const playlistName = playlistResult.playlistName;

        if (debugEnabled) console.debug(`[SpotifyNativePlay-Playlist] Found ${allTracks.length} tracks in playlist "${playlistName}".`);
        for (let track of allTracks) track.spotifynative = "awaiting_resolve";

        const firstTrack = allTracks.shift();
        if (!firstTrack) {
            console.log(`[SpotifyNativePlay-Playlist] Playlist "${playlistName}" is empty.`);
            return null;
        }

        if (debugEnabled) console.debug(`[SpotifyNativePlay-Playlist] Stored ${allTracks.length} remaining tracks on player for guild ${player.guildId}.`);
        const firstTrackResult = await handleSpotifyNativePlay(firstTrack.uri, player, requester, client, firstTrack);
        if (firstTrackResult && firstTrackResult.tracks.length > 0) {

            player.queue.add(firstTrackResult.tracks[0]);
            if (debugEnabled) console.debug(`[SpotifyNativePlay-Playlist] Queued initial track: ${firstTrackResult.tracks[0].title}`);

            if (!player.playing && !player.paused) {
                player.play();
            }
            for (let track of allTracks) player.queue.add(track); 


        } else {
             console.warn(`[SpotifyNativePlay-Playlist] Failed to resolve the very first track: ${firstTrack.title}. Cannot start playlist.`);
             delete player.customData.nativePlaylist;
             return null;
        }

        return playlistResult;

    } catch (e) {
        console.error(`[SpotifyNativePlay-Playlist] Error handling native playlist:`, e);
        return null;
    }
}

/**
 * Scans the next two unresolved tracks in the queue and attempts to resolve them for playback.
 * It tries to use a native Spotify stream first, with a fallback to a YouTube search if that fails.
 * @param {import("kazagumo").KazagumoPlayer} player The Kazagumo player instance.
 * @param {import("discord.js").Client} client The Discord client instance.
 */
async function checkQueueForNativePlay(player, client) {
    const debugEnabled = process.env.DEBUG === 'true';
    if (debugEnabled) console.debug("[SpotifyNativePlay-Resolver] Checking queue for unresolved native tracks.");

    // Limit processing to the next 2 unresolved tracks to avoid spamming requests.
    const tracksToResolve = player.queue.filter(track => track.spotifynative === "awaiting_resolve").slice(0, 2);

    if (!tracksToResolve.length) {
        if (debugEnabled) console.debug("[SpotifyNativePlay-Resolver] No unresolved tracks found to process at this time.");
        return;
    }

    if (debugEnabled) console.debug(`[SpotifyNativePlay-Resolver] Found ${tracksToResolve.length} unresolved tracks to process.`);

    for (const track of tracksToResolve) {
        if (debugEnabled) console.debug(`[SpotifyNativePlay-Resolver] Attempting to resolve: ${track.title}`);
        track.spotifynative = "resolving"; // Mark as resolving to prevent re-processing
        let resolvedTrack = null;
        let success = false;

        try {
            // Attempt to resolve with Spotify Native Play
            const searchResult = await handleSpotifyNativePlay(track.uri, player, track.requester, client, track, true);

            if (searchResult && searchResult.tracks.length > 0) {
                resolvedTrack = searchResult.tracks[0];
                success = true;
                if (debugEnabled) console.debug(`[SpotifyNativePlay-Resolver] Successfully resolved track via native: ${resolvedTrack.title}`);
            }
        } catch (e) {
            console.error(`[SpotifyNativePlay-Resolver] Error during native resolution for ${track.title}:`, e);
            // Fallback will be attempted next.
        }

        // If native play fails or throws, fallback to another engine like YouTube.
        if (!success) {
            if (debugEnabled) console.warn(`[SpotifyNativePlay-Resolver] Native resolve failed for ${track.title}. Falling back to YouTube search.`);
            try {
                // Use a descriptive search query for better results.
                const fallbackResult = await player.search(`${track.title} ${track.author}`, { requester: track.requester, engine: 'youtube' });
                
                if (fallbackResult && fallbackResult.tracks.length > 0) {
                    resolvedTrack = fallbackResult.tracks[0];
                    resolvedTrack.requester = track.requester; // Preserve the original requester.
                    if (debugEnabled) console.debug(`[SpotifyNativePlay-Resolver] Successfully resolved track via fallback: ${resolvedTrack.title}`);
                } else {
                     if (debugEnabled) console.error(`[SpotifyNativePlay-Resolver] Fallback search also failed for ${track.title}.`);
                }
            } catch(e) {
                console.error(`[SpotifyNativePlay-Resolver] Error during fallback resolution for ${track.title}:`, e);
            }
        }

        // Find the original unresolved track in the queue and replace it with the resolved version.
        const trackIndex = player.queue.findIndex(t => t === track);

        if (trackIndex !== -1) {
            if (resolvedTrack) {
                // Kazagumo queue extends Array, so splice is safe.
                player.queue.splice(trackIndex, 1, resolvedTrack);
            } else {
                // If all resolution attempts failed, mark it to prevent re-processing.
                // The player will likely error on this track and skip to the next one.
                track.spotifynative = "failed_resolve";
                if (debugEnabled) console.error(`[SpotifyNativePlay-Resolver] All resolution attempts failed for ${track.title}. Marking as failed.`);
            }
        }
    }
}

module.exports = { handleSpotifyNativePlay, handleSpotifyNativePlaylist, checkQueueForNativePlay };