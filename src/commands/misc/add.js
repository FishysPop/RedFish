const { Client, Interaction, ApplicationCommandOptionType } = require("discord.js");
module.exports =  {
  callback: (client, interaction) => {
    const num1 = interaction.options.get("first-number").value;
    const num2 = interaction.options.get("second-number").value;
    interaction.reply(`The sum is ${num1 + num2}`);},

  name: 'add',
  description: 'Adds two numbers.',
  options: [
    {
      name: 'first-number',
      description: 'The first number.',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'second-number',
      description: 'The second number.',
      type: ApplicationCommandOptionType.Number,
      required: true,
    }
  ]
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
