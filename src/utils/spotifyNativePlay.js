const axios = require("axios");

/**
 * Attempts to get a direct stream from the SpotifyNativeStream API for a given URL.
 * @param {string} url The potential Spotify track URL.
 * @param {import("shoukaku").ShoukakuPlayer} player The Shoukaku player instance.
 * @param {import("discord.js").User} requester The user who requested the track.
 * @returns {Promise<import("kazagumo").KazagumoSearchResult | null>} A Kazagumo search result with a modified track if successful, otherwise null.
 */
async function handleSpotifyNativePlay(url, player, requester) {
    const debugEnabled = process.env.DEBUG === 'true';
    if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Function called with URL: ${url}`);

    console.log(`[SpotifyNativePlay] Attempting to handle Spotify track link: ${url}`);
    const isSpotifyTrackLink = /^https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]{22}/.test(url);
    if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Is Spotify track link: ${isSpotifyTrackLink}`);

    if (!isSpotifyTrackLink || !process.env.SPOTIFY_NATIVE_STREAM_URL) {
        if (!isSpotifyTrackLink) {
            if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Not a Spotify track link. Exiting.");
            return null;
        }
        console.log("[SpotifyNativePlay] Missing required configuration. SPOTIFY_NATIVE_STREAM_URL is not set.");
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Missing SPOTIFY_NATIVE_STREAM_URL environment variable. Exiting.");
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

        if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Requesting stream URL from native API: ${process.env.SPOTIFY_NATIVE_STREAM_URL}/play`);
        
        const headers = {
            'Content-Type': 'application/json',
        };

        if (process.env.SPOTIFY_NATIVE_STREAM_KEY) {
            headers['Authorization'] = `${process.env.SPOTIFY_NATIVE_STREAM_KEY}`;
            if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Authorization key found. Adding to headers.");
        } else {
            if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] No authorization key found. Proceeding without it.");
        }

        const apiResponse = await axios.post(
            `${process.env.SPOTIFY_NATIVE_STREAM_URL}/play`,
            { url: url },
            { headers, timeout: 5000 }
        );
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Received API response:", apiResponse.data);

        if (apiResponse.data && apiResponse.data.streamUrl) {
            const streamUrl = apiResponse.data.streamUrl;
            console.log(`[SpotifyNativePlay] Received stream URL: ${streamUrl}`);
            if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Resolving stream URL with Lavalink.`);

            const streamResult = await player.search(streamUrl, { requester });
            if (!streamResult || !streamResult.tracks.length) {
                console.error(`[SpotifyNativePlay] Lavalink could not resolve the stream URL: ${streamUrl}`);
                if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Lavalink failed to resolve the provided stream URL. Exiting.`);
                return null;
            }

            const playableTrack = streamResult.tracks[0];
            
            playableTrack.title = spotifyTrack.title;
            playableTrack.author = spotifyTrack.author;
            playableTrack.length = spotifyTrack.length;
            playableTrack.thumbnail = spotifyTrack.thumbnail;
            playableTrack.uri = spotifyTrack.uri; 
            playableTrack.sourceName = 'spotify_native';
            playableTrack.requester = requester;

            streamResult.tracks[0] = playableTrack;
            streamResult.type = 'TRACK';

            if (debugEnabled) console.debug(`[SpotifyNativePlay-DEBUG] Successfully created a resolved track with Spotify metadata. Returning result.`);
            return streamResult;
        }
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] API response did not contain a streamUrl. Exiting.");
        return null; 
    } catch (apiError) {
        console.error("[SpotifyNativePlay] API error:", apiError.message, ". Falling back to default search.");
        if (debugEnabled) console.debug("[SpotifyNativePlay-DEBUG] Caught an error during API call. Details:", apiError);
        return null;
    }
}

module.exports = { handleSpotifyNativePlay };
