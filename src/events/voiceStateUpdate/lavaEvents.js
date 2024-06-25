const { ChannelType } = require('discord.js');

module.exports = async (oldChannel, newChannel, client ) => {
    if (client.playerType === 'discord_player') return;
	const player = await client.manager?.players.get(newChannel.guild.id);
	if (!player) return;
	
	if (!newChannel.guild.members.cache.get(client.user.id)?.voice.channelId) { 
		player.destroy().catch(err => err);
		// ignore KazagumoError: Player is already destroyed error
	}


    if (oldChannel.guild.members.cache.get(client.user.id).voice.channelId === oldChannel.channelId) {
		if (oldChannel.guild.members.me.voice?.channel && oldChannel.guild.members.me.voice.channel.members.filter((m) => !m.user.bot).size === 0) {

			await delay(300000);

			const vcMembers = oldChannel.guild.members.me.voice.channel?.members.size;
			if (!vcMembers || vcMembers === 1) {
				if(!player) return;
				await player.destroy().catch(err => err);
			}
		}
	}
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};