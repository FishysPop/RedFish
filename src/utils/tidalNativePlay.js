const fs = require("fs/promises");
const path = require("path");
const { setupCache } = require('axios-cache-interceptor');
const { cacheStorage } = require("./cachestorage");
const axios = require("axios");
const { getTracks, getOriginalTrackUrl, getCover } = require("./hifiApi");

async function getTracksFromHifi({ countryCode = "US", isrc = null, query = null }) {
    if (!query && isrc) {
        query = isrc;
    }

    if (!query) {
        return [];
    }

    try {
        return await getTracks({ countryCode, query });
    } catch (error) {
        console.error("[TidalNativePlay] Error searching tracks with HIFI API:", error.message);
        return [];
    }
}

async function getOriginalTrackUrlFromHifi({ id, quality = "LOW" }) {
    try {
        return await getOriginalTrackUrl({ id, quality });
    } catch (error) {
        console.error(`[TidalNativePlay] Error getting track URL for id ${id} with HIFI API:`, error.message);
        return null;
    }
}

async function getSpotifyTrack(details) {
    let { isrc } = details.external_ids;
    if (!isrc) return null;

    let hifiTracks = await getTracksFromHifi({ isrc });
    if (!hifiTracks || hifiTracks.length === 0) {
        console.warn(`No HIFI tracks found for ISRC: ${isrc}`);
        return null;
    }
    let { id } = hifiTracks[0];
    return getOriginalTrackUrlFromHifi({ id });
}

async function handleTidalNativePlay(url, player, requester, client, originalTrack = null, forceResolve = false) {
    const debugEnabled = process.env.DEBUG === 'true';
    if (!process.env.TIDAL_NATIVE || process.env.TIDAL_NATIVE !== 'true') {
        if (debugEnabled) console.debug("[TidalNativePlay-DEBUG] TIDAL_NATIVE is not enabled.");
        return null;
    }

    let urlObject;
    try {
        urlObject = new URL(url);
    } catch (e) {
        return null;
    }
    
    const isTidalTrack = urlObject.hostname.includes('tidal.com') && urlObject.pathname.includes('/track/');
    if (!isTidalTrack) {
        return null;
    }

    const tidalTrackId = urlObject.pathname.split('/track/')[1];
    if (!tidalTrackId) {
        return null;
    }

    try {
        let tidalTrack = originalTrack;
        if (!tidalTrack) {
            const metadataResult = await player.search(url, { requester });
            if (!metadataResult || metadataResult.type !== 'TRACK' || !metadataResult.tracks.length) {
                return null;
            }
            tidalTrack = metadataResult.tracks[0];
        }

        if (player.queue.size > 2 && !forceResolve) {
            tidalTrack.tidalnative = "awaiting_resolve";
            return { tracks: [tidalTrack], type: 'TRACK' };
        }

        const trackData = await getOriginalTrackUrlFromHifi({ id: tidalTrackId });
        if (trackData) {
            let directUrl = null;
            
            // Check if trackData is an object with a url property
            if (trackData.url) {
                directUrl = trackData.url;
            } else if (typeof trackData === 'object' && trackData.OriginalTrackUrl) {
                // Handle the case where trackData is an object with OriginalTrackUrl
                directUrl = trackData.OriginalTrackUrl;
            } else if (Array.isArray(trackData)) {
                // Handle the case where trackData is an array (as shown in the error log)
                for (const item of trackData) {
                    if (item.OriginalTrackUrl) {
                        directUrl = item.OriginalTrackUrl;
                        break;
                    } else if (item.url && typeof item.url === 'string' && item.url.includes('audio.tidal.com')) {
                        directUrl = item.url;
                        break;
                    } else if (item.manifest && item.trackId) {
                        // Handle manifest format
                        try {
                            const manifest = JSON.parse(Buffer.from(item.manifest, 'base64').toString());
                            if (manifest.urls && manifest.urls.length > 0) {
                                directUrl = manifest.urls[0];
                                break;
                            }
                        } catch (e) {
                            console.warn("[TidalNativePlay] Error parsing manifest:", e.message);
                        }
                    }
                }
            } else if (typeof trackData === 'object' && trackData.trackId) {
                // If trackData is an object with trackId but no URL, try to get URL from other properties
                if (trackData.OriginalTrackUrl) {
                    directUrl = trackData.OriginalTrackUrl;
                } else if (trackData.url && typeof trackData.url === 'string' && trackData.url.includes('audio.tidal.com')) {
                    directUrl = trackData.url;
                }
            }
            
            if (!directUrl) {
                console.error(`[TidalNativePlay] Could not extract direct URL from trackData:`, trackData);
                return null;
            }
            
            const streamResult = await player.search(directUrl, { requester });
            if (!streamResult || !streamResult.tracks.length) {
                console.error(`[TidalNativePlay] Lavalink could not resolve the stream URL: ${directUrl}`);
                return null;
            }

            let coverUrl = tidalTrack.thumbnail;
            if (!coverUrl && tidalTrackId) {
                coverUrl = await getCover({ id: tidalTrackId, size: '640' });
            } else if (!coverUrl && tidalTrack.title && tidalTrack.author) {
                coverUrl = await getCover({ query: `${tidalTrack.title} ${tidalTrack.author}`, size: '640' });
            }

            const playableTrack = streamResult.tracks[0];
            Object.assign(playableTrack, {
                title: tidalTrack.title,
                author: tidalTrack.author,
                length: tidalTrack.length,
                thumbnail: coverUrl || tidalTrack.thumbnail,
                uri: tidalTrack.uri,
                sourceName: 'tidal_native',
                requester: requester,
            });
            playableTrack.tidalnative = 'resolved';

            streamResult.tracks[0] = playableTrack;
            streamResult.type = 'TRACK';
            return streamResult;
        }

        return null;
    } catch (apiError) {
        console.error("[TidalNativePlay] Error during native playback process:", apiError.message);
        return null;
    }
}


async function handleTidalNativePlaylist(url, player, requester, client) {
    const playlistResult = await client.manager.search(url, { requester, engine: 'youtube' });
    if (!playlistResult || playlistResult.type !== 'PLAYLIST' || !playlistResult.tracks.length) {
        return null;
    }

    for (let track of playlistResult.tracks) {
        track.tidalnative = "awaiting_resolve";
        if (!track.thumbnail && track.title && track.author) {
            try {
                const coverUrl = await getCover({ query: `${track.title} ${track.author}`, size: '640' });
                if (coverUrl) {
                    track.thumbnail = coverUrl;
                }
            } catch (coverError) {
                console.warn("[TidalNativePlay] Error getting cover for playlist track:", coverError.message);
            }
        }
    }
    
    player.queue.add(playlistResult.tracks);

    if (!player.playing && !player.paused) {
        player.play();
    }

    return playlistResult;
}


async function checkQueueForTidalNativePlay(player, client) {
    const tracksToResolve = player.queue.filter(track => track.tidalnative === "awaiting_resolve").slice(0, 2);
    if (!tracksToResolve.length) return;

    for (const track of tracksToResolve) {
        track.tidalnative = "resolving";
        try {
            const searchResult = await handleTidalNativePlay(track.uri, player, track.requester, client, track, true);
            if (searchResult && searchResult.tracks.length > 0) {
                const resolvedTrack = searchResult.tracks[0];
                const trackIndex = player.queue.findIndex(t => t === track);
                if (trackIndex !== -1) {
                    player.queue.splice(trackIndex, 1, resolvedTrack);
                }
            } else {
                 throw new Error("Native resolution failed.");
            }
        } catch (e) {
            console.warn(`[TidalNativePlay-Resolver] Native resolve failed for ${track.title}. Falling back.`);
            const fallbackResult = await player.search(`${track.title} ${track.author}`, { requester: track.requester, engine: 'youtube' });
            if (fallbackResult && fallbackResult.tracks.length > 0) {
                const resolvedTrack = fallbackResult.tracks[0];
                
                let coverUrl = track.thumbnail;
                if (!coverUrl && track.title && track.author) {
                    coverUrl = await getCover({ query: `${track.title} ${track.author}`, size: '640' });
                }
                
                resolvedTrack.thumbnail = coverUrl || track.thumbnail;
                resolvedTrack.requester = track.requester;
                const trackIndex = player.queue.findIndex(t => t === track);
                if (trackIndex !== -1) {
                    player.queue.splice(trackIndex, 1, resolvedTrack);
                }
            } else {
                track.tidalnative = "failed_resolve";
            }
        }
    }
}

async function searchTidalTracks(query, requester) {
    try {
        const tracks = await getTracksFromHifi({ query, countryCode: 'US' });

        let processedTracks = tracks;
        if (Array.isArray(tracks) && tracks.length > 0 && tracks[0].id === undefined) {
            for (const item of tracks) {
                if (item.id && item.title) {
                    processedTracks = [item];
                    break;
                } else if (item.trackId && item.title) {
                    processedTracks = [item];
                    break;
                }
            }
        }

        const formattedTracks = await Promise.all(processedTracks.map(async (track) => {
            let coverUrl = null;
            if (track.id || track.trackId) {
                coverUrl = await getCover({ id: track.id || track.trackId, size: '640' });
            } else if (track.title && track.artist) {
                coverUrl = await getCover({ query: `${track.title} ${track.artist}`, size: '640' });
            }

            return {
                title: track.title || track.name,
                author: (track.artists && track.artists[0]) ? track.artists[0].name : track.artist,
                uri: track.url || track.uri || `https://tidal.com/browse/track/${track.id || track.trackId}`,
                length: (track.duration || track.duration_ms || track.length) * 1000,
                thumbnail: coverUrl || track.album?.image || track.thumbnail || track.cover,
                sourceName: 'tidal',
                requester: requester,
            };
        }));

        return {
            tracks: formattedTracks,
            type: 'SEARCH',
            playlistName: null,
        };
    } catch (error) {
        console.error("[TidalNativePlay-Search] Error during HIFI search:", error.message);
        return { tracks: [], type: 'SEARCH', playlistName: null };
    }
}


module.exports = {
    handleTidalNativePlay,
    handleTidalNativePlaylist,
    checkQueueForTidalNativePlay,
    getSpotifyTrack,
    searchTidalTracks,
    getTracksFromHifi,
    getOriginalTrackUrlFromHifi,
    getCover
};