# RedFish - A Multi-Purpose Music Bot

<p align="center">
  <a href="https://discord.com/invite/rDHPK2er3j">
    <img src="https://img.shields.io/discord/1105149646612987934?style=for-the-badge" alt="Discord Server">
  </a>
</p>

RedFish is a simple yet versatile Discord bot that brings various functionalities to your server. From music playback and giveaways to moderation, auto-rooms, and more, RedFish is designed to enhance your Discord experience.

## ✨ Features

### 🎶 Music
- Play songs or playlists from YouTube, Spotify, SoundCloud, radio stations, or direct URLs.
- Intuitive button controls for seamless music management.

### 👋 Welcome System
- Set custom welcome, leave, and ban messages to greet and manage your community.

### 🎙️ Auto Rooms
- Effortlessly create temporary voice channels for your members.

### 🎁 Giveaways
- Host exciting giveaways with options to create, manage, reroll, and delete them.

### 🎫 Tickets
- Implement a straightforward ticket system with user-friendly buttons.

### 🔨 Moderation
- Commands for banning, kicking, and timing out users to keep your server in check.

### 🤖 AutoRole
- Automatically assign roles to new members upon joining.

### ⬆️ Levels
- Engage your community with a fun leveling system.

## 🚀 Getting Started

1. **Invite RedFish:** [Invite Link](https://top.gg/bot/1105149646612987934)
2. Host Your Own!
   
## 🛠️ Technical Details

- **Music Engine:** Powered by [discord-player](https://www.npmjs.com/package/discord-player) and [Lavalink](https://lavalink.dev/).


## 🤖 Self Hosting

### 1. Install Dependencies:
```npm install```
### 2. Environment Variables:
Create a .env file in the root directory and copy the contents of .env.example into it. Replace the placeholder values with your actual credentials:

### 3. Music Setup:
#### 1. Using Lavalink (Recommended for better performance): 
Host your own lavalink server ([Setup Guide](https://lavalink.dev/getting-started/index.html))
or use public lavalink servers with ```npm run publicLavalinkServers``` or at https://lavalink.darrennathanael.com/
```
#.env
DISCORD_PLAYER = false

LAVALINK = true
LAVALINK_URI = YOUR_IP:UR_PORT@UR_PASSWORD

#https://developer.spotify.com/dashboard If you dont have a Spotify id
SPOTIFY_ID = YOUR_SPOTIFY_ID
SPOTIFY_SECRET =  YOUR_SPORTIFY_SECRET
```
#### 2. Using discord-player (Simpler setup, but may have performance and ratelimit problems):
```
#.env
LAVALINK = false
DISCORD_PLAYER = true
```
### 4. Start the Bot:
```npm run start```
