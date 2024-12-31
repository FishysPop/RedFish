const Giveaway = require("../../models/Giveaway"); 
const {EmbedBuilder} = require("discord.js");
module.exports = (client) => {
  if (client.cluster.id === 0) { 
  var timerID = setInterval(async function() {
    const currentDate = new Date();
    
    const giveaway = await Giveaway.find({ giveawayEnd: { $lt: currentDate }, ended: false });
    if (giveaway.length > 0) {
    } else {
    return;
    }

    giveaway.forEach(async firstGiveaway => {
      console.log(firstGiveaway)
      const unixTimestamp = Math.floor(currentDate.getTime() / 1000);
      const timestamp = `<t:${unixTimestamp}:R>`;
      const giveawayArray = firstGiveaway.entriesArray
      const discordIdCount = firstGiveaway.entriesArray.length;
      let guild = client.guilds.cache.get(firstGiveaway.guildId);
   
      function pickRandomFromArray(array, count) {
        if (!Array.isArray(array)) {
          console.log('The input must be an array.');
        }
      
        const shuffledArray = [...array];
        const selectedElements = [];
      
        while (shuffledArray.length > 0 && count > 0) {
          const randomIndex = Math.floor(Math.random() * shuffledArray.length);
          const selectedElement = shuffledArray.splice(randomIndex, 1)[0];
          selectedElements.push(selectedElement);
      
          count--;
        }
      
        return selectedElements;
      }
      const winners = pickRandomFromArray(firstGiveaway.entriesArray, firstGiveaway.winners);
      const mentionedWinners = [];
      winners.forEach(winnerId => {
        const mentionedWinner = `<@${winnerId}>`;
        mentionedWinners.push(mentionedWinner);
      });
      
      const mentionedWinnersString = mentionedWinners.join(' ');
      const giveawayEmbed = new EmbedBuilder()
        .setColor("#e66229")
        .setTitle(firstGiveaway.messageTitle)
        .setDescription(
          `Winners: ${mentionedWinnersString}\nEntries: ${discordIdCount}\n Ended: ${timestamp}`
        )
        .setFooter({ text: `/giveaway reroll to reroll` });
        const embedData = giveawayEmbed.toJSON();
        const giveawayData = {
          guildId: firstGiveaway.guildId,
          channelId: firstGiveaway.channelId,
          messageId: firstGiveaway.messageId,
          messageTitle: firstGiveaway.messageTitle,
        };  
  
        if (client.cluster) {
          try {
            await client.cluster.broadcastEval(async (c, { embedData, guildId, channelId, messageId }) => {
              const { EmbedBuilder } = require('discord.js');
              const guild = c.guilds.cache.get(guildId);
              if (guild) {
                const channel = guild.channels.cache.get(channelId);
                if (!channel) return;

                const receivedEmbed = EmbedBuilder.from(embedData);
                const message = await channel.messages.fetch(messageId);
                message.edit({
                  embeds: [receivedEmbed],
                  components: []
                }).catch((err) => { console.log("error while checking giveaway.:", err) });
              }
              return;
            }, { context: { embedData, guildId: firstGiveaway.guildId, channelId: firstGiveaway.channelId, messageId: firstGiveaway.messageId } });
          } catch (error) {
            console.error("Error editing giveaway message or finding it:", "MessageId: ", firstGiveaway.messageId, "Error: ", error);
          }
          firstGiveaway.ended = true
          firstGiveaway.endedDate = currentDate
          firstGiveaway.save();
  
      }
      
    });
}, 5 * 1000); 

var timerID2 = setInterval(async function() {
  const currentDate = new Date();
  const oneMonthAgo = new Date(currentDate);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  Giveaway.findOneAndDelete({ giveawayEnd: { $lt: oneMonthAgo }, ended: true })
  .then((deletedGiveaway) => {
    if (deletedGiveaway) {
    } else {
    }
  })
  .catch((error) => {
    console.error("Error deleting giveaway:", error);
  });
  
}, 60 * 60 * 1000); 

  }
}