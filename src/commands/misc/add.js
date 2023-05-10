const { Client, Interaction, ApplicationCommandOptionType , SlashCommandBuilder } = require("discord.js");
module.exports =  {
 data: new SlashCommandBuilder()
 .setName('add')
 .setDescription("Adds two numbers.")
 .addStringOption(option => option
  .setName('first-number')
  .setDescription("First Number")
  .setRequired(true))
  .addStringOption(option => option
    .setName('second-number')
    .setDescription("Second Number")
    .setRequired(true)),


  run: ({client, interaction}) => {
    const num1 = interaction.options.get("first-number").value;
    const num2 = interaction.options.get("second-number").value;
    interaction.reply(`The sum is ${num1 + num2}`);},

  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: true

};
