# RedFish - A Multi-Purpose Music Bot

<p align="center">
  <a href="https://discord.com/invite/rDHPK2er3j">
    <img src="https://img.shields.io/discord/870670135248158730?style=for-the-badge" alt="Discord Server">
  </a>
</p>

[Discord Server](https://discord.com/invite/rDHPK2er3j) | [Invite Bot](https://top.gg/bot/1105149646612987934)

RedFish is a Discord bot built with Node.js and Discord.js, designed to handle high-quality audio playback and server utility.

## Features

- **Music Playback**: Stream tracks, playlists, and live radio from YouTube, Spotify, SoundCloud, Deezer, Tidal, and direct streams via Lavalink.
- **Auto Rooms**: Dynamic temporary voice channel creation on user join.
- **Giveaways**: System for hosting, managing, rerolling, and ending community giveaways.
- **Ticket System**: Button-based support ticket creation and management.
- **Moderation**: Commands for moderation workflows including ban, kick, and timeout management.
- **Auto Role & Leveling**: Automatic role assignment on join and activity tracking.

## Self Hosting

### 1. Requirements & Setup

Install project dependencies:

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory following `.env.example`:

```env
BOT_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_CLIENT_ID
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING

# Lavalink Connection
LAVALINK=true
LAVALINK_URI=HOST:PORT@PASSWORD

# Spotify API Credentials
SPOTIFY_ID=YOUR_SPOTIFY_CLIENT_ID
SPOTIFY_SECRET=YOUR_SPOTIFY_CLIENT_SECRET
```

### 3. Audio Engine (Lavalink)

Audio playback relies on a [Lavalink v4](https://lavalink.dev/) server with source plugins (such as LavaSrc). 

You can host your own node or configure public nodes. To fetch active public Lavalink nodes:

```bash
npm run publicLavalinkServers
```

### 4. Start the Application

```bash
npm run start
```
