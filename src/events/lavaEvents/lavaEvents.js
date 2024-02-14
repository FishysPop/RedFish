const { EmbedBuilder, Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField} = require('discord.js')
const { convertTime } = require("../../utils/ConvertTime.js");

module.exports = (client) => {
client.manager.shoukaku.on('ready', (name) => console.log(`Lavalink ${name}: Ready!`));
client.manager.shoukaku.on('error', (name, error) => console.error(`Lavalink ${name}: Error Caught,`, error));
client.manager.shoukaku.on('close', (name, code, reason) => console.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`));
client.manager.shoukaku.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug,`, info));
client.manager.shoukaku.on('disconnect', (name, players, moved) => {
    if (moved) return;
    players.map(player => player.connection.disconnect())
    console.warn(`Lavalink ${name}: Disconnected`);
});

client.manager.on("playerStart", async (player, track) => {
    const playerStartEmbed = await new EmbedBuilder() //embed
	.setColor('#e66229')
	.setTitle(track.title)
	.setURL(track.realUri)
	.setAuthor({ name: 'Now Playing'})
	.setThumbnail(track.thumbnail)
    .setDescription(`Duration: **${convertTime(track.length, true)}**`)
    .setTimestamp()
    .setFooter({ text: `Requested by: ${track.requester.username}`});
    const playPauseButton = new ButtonBuilder().setCustomId('LavaPause').setEmoji('<:w_playpause:1106270708243386428').setStyle(ButtonStyle.Primary);
    const skipButton = new ButtonBuilder().setCustomId('LavaSkip').setEmoji('<:w_next:1106270714664849448').setStyle(ButtonStyle.Success);
    const stopButton = new ButtonBuilder().setCustomId('LavaStop').setEmoji('<:w_stop:1106272001909346386>').setStyle(ButtonStyle.Danger);
    const loopButton = new ButtonBuilder().setCustomId('LavaLoop').setEmoji('<:w_loop:1106270705575792681>').setStyle(ButtonStyle.Secondary);
    const shuffleButton = new ButtonBuilder().setCustomId('LavaShuffle').setEmoji('<:w_shuffle:1106270712542531624>').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder()
   .addComponents(playPauseButton, skipButton, stopButton, loopButton, shuffleButton);
    client.channels.cache.get(player.textId)?.send({ embeds: [playerStartEmbed] ,components: [row]})
        .then(x => player.data.set("message", x));
});

client.manager.on("playerEnd", (player) => {
    player.data.get("message")?.edit({
        components: [],
      })
});

client.manager.shoukaku.on("playerEmpty", player => {
    client.channels.cache.get(player.textId)?.send({content: `Destroyed player due to inactivity.`})
        .then(x => player.data.set("message", x));
    player.destroy();
});

}
