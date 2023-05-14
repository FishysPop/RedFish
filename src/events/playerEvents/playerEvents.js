const { EmbedBuilder } = require('discord.js')

player.events.on('playerStart', (queue, track) => {
    const playerStartEmbed = new EmbedBuilder()
	.setColor('#e66229')
	.setTitle(track.title)
	.setURL(track.url)
	.setAuthor({ name: 'Now Playing'})
	.setThumbnail(track.thumbnail)
    .setDescription(`Duration: **${track.duration}**`)
    .setTimestamp()
    .setFooter({ text: `Requested by ${queue.metadata.requestedBy}#${queue.metadata.discriminator}`});
    // we will later define queue.metadata object while creating the queue
    queue.metadata.channel.send({ embeds: [playerStartEmbed] });
});
