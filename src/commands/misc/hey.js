module.exports = {
  name: "hey",
  description: "Replies with hey!",
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,

  callback: (client, interaction) => {
    interaction.reply("Hey There!");
  },
};
