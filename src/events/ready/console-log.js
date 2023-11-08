const { ActivityType } = require('discord.js');
module.exports = (client) => {
    console.log(`${client.user.tag} is online`);
    try {
        var timerID = setInterval(async function() {
        client.user.setActivity('/play', { type: ActivityType.Watching });

        }, 60 * 60 * 1000)
    } catch (error) {
        console.log(error)

    }

};