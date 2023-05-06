require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder , ActivityType} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let status = [
  {
    name: "Swiming In A Pond",
    type: ActivityType.Streaming,
    url: 'https://www.twitch.tv/fishypop_'
  },
  {
    name: "Eating Worms",
    type: ActivityType.Streaming,
    url: 'https://www.twitch.tv/fishypop_'
  },
  {
    name: "Swiming Away From Predators",
    type: ActivityType.Streaming,
    url: 'https://www.twitch.tv/fishypop_'
  },
]

client.on("ready", (c) => {
  console.log(`${c.user.username} is online`);
  setInterval(() => {
 let random = Math.floor(Math.random() * status.length);
 client.user.setActivity(status[random]);
  }, 10000);

});

client.on("interactionCreate", (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "hey") {
    interaction.reply("hey there!");
  }
  if (interaction.commandName === "ping") {
    interaction.reply("Pong!");
  }
  if (interaction.commandName === "add") {
    const num1 = interaction.options.get("first-number").value;
    const num2 = interaction.options.get("second-number").value;

    interaction.reply(`The sum is ${num1 + num2}`);
  }
  if (interaction.commandName === "embed") {
    const embed = new EmbedBuilder()
      .setTitle("Embed title")
      .setDescription("this is an embed description")
      .setColor("Random")
      .addFields({ name: "Field title", value: "Random Value", inline: true });
    interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
