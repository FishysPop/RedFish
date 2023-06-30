const Giveaway = require("../../models/Giveaway"); 
const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle} = require("discord.js");
module.exports = (client) => {
var timerID = setInterval(async function() {
    const currentDate = new Date();
    
    const giveaway = await Giveaway.find({ giveawayEnd: { $lt: currentDate }, ended: false });
    if (giveaway.length > 0) {
    } else {
    return;
    }
    const firstGiveaway = giveaway[0];
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
    console.lo
    const user = await guild.fetch(winners);   
    const giveawayEmbed = new EmbedBuilder()
      .setColor("#e66229")
      .setTitle(firstGiveaway.messageTitle)
      .setDescription(
        `Winners: <@${winners}>\nEntries: ${discordIdCount}\n Ended: ${timestamp}`
      )
      .setFooter({ text: `/giveaway reroll to reroll` });
    const giveawayEnterButton = new ButtonBuilder()
      .setCustomId("giveawayEnter")
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(giveawayEnterButton);
    if (guild) {
      const channel = guild.channels.cache.get(firstGiveaway.channelId);
      const message = await channel.messages.fetch(firstGiveaway.messageId);
      message.edit({
        embeds: [giveawayEmbed],
        components: []
      }).catch((err) => {console.log("error while sending message for giveaway enter:", err)});
    }
    firstGiveaway.ended = true
    firstGiveaway.endedDate = currentDate
    firstGiveaway.save();
    
}, 5 * 1000); 
}