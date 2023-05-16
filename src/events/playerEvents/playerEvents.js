const { EmbedBuilder, Client, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js')

player.events.on('playerStart', async (queue, track) => {
    const playerStartEmbed = new EmbedBuilder() //embed
	.setColor('#e66229')
	.setTitle(track.title)
	.setURL(track.url)
	.setAuthor({ name: 'Now Playing'})
	.setThumbnail(track.thumbnail)
    .setDescription(`Duration: **${track.duration}**`)
    .setTimestamp()
    .setFooter({ text: `Requested by ${track.requestedBy.username}#${track.requestedBy.discriminator}`});
    const playPauseButton = new ButtonBuilder().setCustomId('Pause').setEmoji('<:w_playpause:1106270708243386428').setStyle(ButtonStyle.Primary);
    const skipButton = new ButtonBuilder().setCustomId('Skip').setEmoji('<:w_next:1106270714664849448').setStyle(ButtonStyle.Success);
    const stopButton = new ButtonBuilder().setCustomId('Stop').setEmoji('<:w_stop:1106272001909346386>').setStyle(ButtonStyle.Danger);
    const loopButton = new ButtonBuilder().setCustomId('Loop').setEmoji('<:w_loop:1106270705575792681>').setStyle(ButtonStyle.Secondary);
    const shuffleButton = new ButtonBuilder().setCustomId('Shuffle').setEmoji('<:w_shuffle:1106270712542531624>').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder()
   .addComponents(playPauseButton, skipButton, stopButton, loopButton, shuffleButton);
   
   
   queue.metadata.channel.send({ embeds: [playerStartEmbed] ,components: [row]});
});
