const { handleSpotifyNativePlay, handleSpotifyNativePlaylist, checkQueueForNativePlay } = require("./spotifyNativePlay.js");
const { handleTidalNativePlay, handleTidalNativePlaylist, checkQueueForTidalNativePlay } = require("./tidalNativePlay.js");

class ThirdPartySourceHandler {
    constructor() {
        this.sources = new Map();
        this.initializeDefaultSources();
    }

    initializeDefaultSources() {
        this.registerSource('spotify', {
            handler: handleSpotifyNativePlay,
            playlistHandler: handleSpotifyNativePlaylist,
            queueResolver: checkQueueForNativePlay,
            isEnabled: () => process.env.SPOTIFY_NATIVE === 'true',
            isUrlSupported: (url) => {
                try {
                    const urlObject = new URL(url);
                    return urlObject.hostname === 'open.spotify.com' && (urlObject.pathname.includes('/track/') || urlObject.pathname.includes('/playlist/'));
                } catch (e) {
                    return false;
                }
            },
            isUserEnabled: (playerSettings) => playerSettings?.SpotifyNativePlay || false
        });
        
        this.registerSource('tidal', {
            handler: handleTidalNativePlay,
            playlistHandler: handleTidalNativePlaylist,
            queueResolver: checkQueueForTidalNativePlay,
            isEnabled: () => process.env.TIDAL_NATIVE === 'true',
            isUrlSupported: (url) => {
                try {
                    const urlObject = new URL(url);
                    return urlObject.hostname.includes('tidal.com') && (urlObject.pathname.includes('/track/') || urlObject.pathname.includes('/album/') || urlObject.pathname.includes('/playlist/'));
                } catch (e) {
                    return false;
                }
            },
            isUserEnabled: (playerSettings) => playerSettings?.TidalNativePlay || false
        });
    }

    registerSource(name, config) {
        this.sources.set(name, {
            name,
            handler: config.handler,
            playlistHandler: config.playlistHandler,
            queueResolver: config.queueResolver,
            isEnabled: config.isEnabled || (() => true),
            isUrlSupported: config.isUrlSupported,
            ...config
        });
    }

    getSource(name) {
        return this.sources.get(name);
    }

    getSupportedSources() {
        return Array.from(this.sources.keys());
    }

    async handleSource(url, player, requester, client, originalTrack = null, forceResolve = false, playerSettings = null) {
        for (const [sourceName, sourceConfig] of this.sources) {
            if (sourceConfig.isEnabled() && sourceConfig.isUrlSupported(url)) {
                if (sourceConfig.isUserEnabled && playerSettings && !sourceConfig.isUserEnabled(playerSettings)) {
                    continue; 
                }
                
                try {
                    return await sourceConfig.handler(url, player, requester, client, originalTrack, forceResolve);
                } catch (error) {
                    console.error(`Error in ${sourceName} source handler:`, error);
                    continue; 
                }
            }
        }
        return null; 
    }

    async checkQueueForSourceResolution(player, client) {
        for (const [sourceName, sourceConfig] of this.sources) {
            if (sourceConfig.isEnabled() && sourceConfig.queueResolver) {
                try {
                    await sourceConfig.queueResolver(player, client);
                } catch (error) {
                    console.error(`Error in ${sourceName} queue resolver:`, error);
                }
            }
        }
    }
}

const thirdPartySourceHandler = new ThirdPartySourceHandler();

module.exports = {
    thirdPartySourceHandler,
    ThirdPartySourceHandler
};