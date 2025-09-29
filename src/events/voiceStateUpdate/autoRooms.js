const { Client, GuildMember, ChannelType } = require('discord.js');
const AutoRoom = require('../../models/AutoRoom');

module.exports = async (oldChannel, newChannel, client ,handler) => {
    if (oldChannel.channelId === newChannel.channelId) {
        return; 
    }
    const guild = oldChannel.guild
    const autoroom = await AutoRoom.findOne({ guildId: guild.id });
    if (!autoroom) return;
    if (newChannel.channelId === autoroom.source) {
        const message = autoroom.channelName.replace('(user)',`${newChannel.member.user.globalName}`); //changes (user) to the person who joins the channels name
        let newCreatedChannel;
        try {
            newCreatedChannel = await guild.channels.create({
                name: message,
                type: ChannelType.GuildVoice,
                parent: `${autoroom.category}`,
              });
        } catch (error) {
            console.log("error while creating channel", error);
            return;
        }
        autoroom.autoroomArray.push(newCreatedChannel.id);
        await newChannel.setChannel(newCreatedChannel).catch((error) =>{
            newCreatedChannel.delete().catch((error) => {console.log(error)}); 
        });




        await autoroom.save();

    }
    if (autoroom.autoroomArray.includes(oldChannel.channelId)) {
        try {
        const channel = await client.channels.fetch(oldChannel.channelId)
            if (channel.members.size === 0) {
                // Delete the empty autoroom channel
                if (!channel) return;
                await channel.delete();
                await AutoRoom.updateOne(
                    { _id: autoroom._id },
                    { $pull: { autoroomArray: oldChannel.channelId } }
                  ).catch((error) => {console.error("Error occurred while removing entry from autoroom:", error);
                    });
            }
        } catch (error) {
            }
        
    }

};