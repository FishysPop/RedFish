const { Client, Interaction } = require('discord.js');
const { useQueue } = require('discord-player');


/**
 *
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (interaction, client ,handler) => {
    const queue = useQueue(interaction.guildId)
    if(interaction.isButton()) {
       const buttonname = interaction.customId
       const user = interaction.user.username
       const usera = interaction.user
       const discriminator = interaction.user.discriminator
        if(buttonname ==='Pause') { try {
            let playing = !queue.node.isPaused();
            if (playing) {
                interaction.reply(`${user}#${discriminator} has paused the queue.`)
                queue.node.pause()
                
            } else {
                interaction.reply(`${user}#${discriminator} has resumed the queue.`)
                queue.node.resume();
            } } catch {
                interaction.reply(`${usera} there is no music playing`)
            }
         return;
        }
        if(buttonname ==='Skip') {
            if (!queue || !queue.isPlaying()) {
                interaction.reply(`${usera} there is no music playing`)
               } else {
                queue.node.skip()
                interaction.reply(`${user}#${discriminator} has skipped a song.`)
               }
            return;
        }
        if(buttonname ==='Stop') {
            try {
                queue.delete();
                interaction.reply(`${user}#${discriminator} has disconnected the bot.`)
               } catch {
                interaction.reply(`${usera} there is no music playing`)
               }
            return;
        }
        if(buttonname ==='Loop') {
            try {
                let repeatMode = queue.repeatMode;
                if (repeatMode === 0) {
                    interaction.reply(`${user}#${discriminator} has looped the queue.`)
                    queue.setRepeatMode(2);
                    
            } else {
                   interaction.reply(`${user}#${discriminator} has unlooped the queue.`)
                    queue.setRepeatMode(0);
                } } catch {
                    interaction.reply(`${usera} there is no music playing`)
                }
             return;
        }
        if(buttonname ==='Shuffle') {
            try {
                queue.tracks.shuffle();
                interaction.reply(`${user}#${discriminator} has shuffled the queue.`)
               } catch {
                interaction.reply(`${usera} there is no music playing`)
               }
            return;
        }
    }
};