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

                const { id: jobID, trackId: spotifyTrackID, status, streamUrl, error: errorMessage } = message;

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

                    if (status === 'completed' && streamUrl) {
                        clearTimeout(jobPromise.timeoutId);
                        jobPromise.resolve(streamUrl);
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
async function handleSpotifyNativePlay(url, player, requester, client) {
    const debugEnabled = process.env.DEBUG === 'true';
    if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Function called with URL: ${url}`);

    if (!process.env.SPOTIFY_NATIVE_STREAM_URL) {
        console.log("[SpotifyNativePlay] Missing required configuration. SPOTIFY_NATIVE_STREAM_URL is not set.");
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Missing SPOTIFY_NATIVE_STREAM_URL environment variable. Exiting.");
        return null;
    }

    let reliableSpotifyTrackId;
    try {
        const urlObject = new URL(url);
        const isSpotifyTrackLink = urlObject.hostname === 'open.spotify.com' && urlObject.pathname.startsWith('/track/');
        if (!isSpotifyTrackLink) {
            if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Not a Spotify track link. Exiting.");
            return null;
        }
        reliableSpotifyTrackId = urlObject.pathname.split('/')[2];
        if (!reliableSpotifyTrackId || reliableSpotifyTrackId.length !== 22) {
            throw new Error('Invalid Spotify Track ID found in URL.');
        }
    } catch (e) {
        console.error(`[SpotifyNativePlay] Could not parse or extract Spotify track ID from URL: ${url}`, e);
        return null;
    }

    try {
        if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Searching for metadata for URL: ${url}`);
        const metadataResult = await player.search(url, { requester });
        if (!metadataResult || metadataResult.type !== 'TRACK' || !metadataResult.tracks.length) {
            console.log(`[SpotifyNativePlay] Could not resolve metadata for ${url} from Lavalink or it's not a single track.`);
            if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Metadata search failed or returned no tracks. Exiting.", metadataResult);
            return null;
        }
        const spotifyTrack = metadataResult.tracks[0];
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Successfully retrieved metadata for:", spotifyTrack.title);

        const ws = await ensureInteractiveWebSocket(client, debugEnabled);

        const streamUrlPromise = new Promise((resolve, reject) => {
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

        const streamUrl = await streamUrlPromise;

            if (streamUrl) {
                console.log(`[SpotifyNativePlay] Received stream URL: ${streamUrl}`);
                if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Resolving stream URL with Lavalink.`);

                const streamResult = await player.search(streamUrl, { requester });
                if (!streamResult || !streamResult.tracks.length) {
                    console.error(`[SpotifyNativePlay] Lavalink could not resolve the stream URL: ${streamUrl}`);
                    if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Lavalink failed to resolve the provided stream URL. Exiting.`);
                    return null;
                }

                const playableTrack = streamResult.tracks[0];
                Object.assign(playableTrack, {
                    title: spotifyTrack.title, author: spotifyTrack.author, length: spotifyTrack.length,
                    thumbnail: spotifyTrack.thumbnail, uri: spotifyTrack.uri, sourceName: 'spotify_native',
                    requester: requester,
                });

                streamResult.tracks[0] = playableTrack;
                streamResult.type = 'TRACK';

                if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Successfully created a resolved track with Spotify metadata. Returning result.`);
                return streamResult;
            }

        console.error("[SpotifyNativePlay] Stream URL was not resolved from WebSocket.");
        return null; 
    } catch (apiError) {
        console.error("[SpotifyNativePlay] Error during native playback process:", apiError.message, ". Falling back to default search.");
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Caught an error during API/WebSocket process. Details:", apiError);

        // If a timeout occurs, the connection might be stale. Close it to force a reconnection on the next attempt.
        if (apiError.message.includes('timed out') && client.spotifyNativeWs) {
            if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Timeout detected. Closing WebSocket to force reconnection on next attempt.");
            client.spotifyNativeWs.close(1000, "Job timeout");
        }

        return null;
    }
}

module.exports = { handleSpotifyNativePlay };
