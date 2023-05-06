require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const roles = [
  {
    id: "873847246007988224",
    label: "Blue",
  },
  {
    id: "873847247161397278",
    label: "Red",
  },
  {
    id: "873847247551496274",
    label: "Purple",
  },
  {
    id: "873847248629416006",
    label: "Green",
  },
  {
    id: "873847249380200448",
    label: "Yellow",
  },
];

client.on("ready", async (c) => {
  try {
    const channel = await client.channels.cache.get("873847265184342046");
    if (!channel) return;

    const row = new ActionRowBuilder();

    roles.forEach((role) => {
      row.components.push(
        new ButtonBuilder()
          .setCustomId(role.id)
          .setLabel(role.label)
          .setStyle(ButtonStyle.Primary)
      );
    });

    await channel.send({
      content: "Claim Or Remove A Role",
      components: [row],
    });
  } catch (error) {
    console.log(error);
  }
});

client.login(process.env.TOKEN);
