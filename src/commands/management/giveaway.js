const {Client,Interaction,SlashCommandBuilder,PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const Giveaway = require("../../models/Giveaway");
const ms = require('ms');
module.exports = {
    data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create a giveaway.')
    .addSubcommand((subcommand) => subcommand.setName("create").setDescription("create a giveaway")
        .addChannelOption(option => option
          .setName('channel')
          .setDescription('The channel you want the giveaway message to be sent')
          .addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addNumberOption(option => option
              .setName('winners')
              .setDescription('How many winners you want the giveaway to have.').setRequired(true))
                .addStringOption((option) => option
                  .setName('duration')
                  .setDescription('How long should the giveaway last etc: 1h, 2d , 94m , 1w').setRequired(true))
                    .addStringOption(option => option
                      .setName('message')
                      .setDescription('The title of the ticket message.').setRequired(true))
                        .addRoleOption((option) => option
                          .setName('required-role')
                           .setDescription('The role user need to have to enter the giveaway')))
    .addSubcommand((subcommand) => subcommand.setName("end").setDescription("End an active giveaway.")
        .addStringOption(option => option
          .setName('message-id')
          .setDescription('The giveaway message id | right click and copy message id').setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName("reroll").setDescription("Reroll the giveaway winners.")
        .addStringOption(option => option
            .setName('message-id')
            .setDescription('The giveaway message id | right click and copy message id').setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName("delete").setDescription("delete an active giveaway.")
      .addStringOption(option => option
        .setName('message-id')
        .setDescription('The giveaway message id or link | right click and copy message id').setRequired(true))),

    run: async ({ interaction, client, handler }) => {
     await interaction.deferReply();
     const subcommand = interaction.options.getSubcommand();
    if(!PermissionsBitField.Flags.ManageChannels) return await interaction.editreply({content: 'I do not have manageChannels permission', ephemeral: true})
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        interaction.reply({content: 'Only server admins can run this comamand', ephemeral: true})
        return;
     }    
     if (!interaction.inGuild()) {
      interaction.editReply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });
     return;
    }
     if (subcommand === 'create' ) {
      const channel = interaction.options.getChannel('channel')
      const winners = interaction.options.get('winners').value
      const duration = interaction.options.getString('duration')
      const message = interaction.options.getString('message')
      const date = new Date();
      const requiredRole = interaction.options.getString('required-role') || 'null';   
      if (!interaction.guild.members.me?.permissionsIn(channel).has(PermissionsBitField.Flags.SendMessages)) {
        interaction.reply({
          content: "I do not have permissons to send messages in that channel",
          ephermeral: true,
        });      
        return;
      }
      const msDuration = ms(duration);
      if (isNaN(msDuration)) {
        await interaction.editReply('Please provide a valid timeout duration.');
        return;
      }
      if (msDuration < 60000 || msDuration > 7.884e+9) {
        await interaction.editReply('Giveaway lenth cannot be shorter than 1 minute or 3 months.');
        return;
      }
      const dateWithDuration = new Date(date.getTime() + msDuration)
      const unixTimestamp = Math.floor(dateWithDuration.getTime() / 1000);
      const timestamp = `<t:${unixTimestamp}:R>`;

      const foundChannel = client.channels.cache.get(channel.id);
      const giveawayEmbed = await new EmbedBuilder() 
      .setColor('#e66229')
      .setTitle(message)
      .setDescription(`Winners: ${winners}\nEntries: 0\n Ends In:${timestamp}`)
      .setFooter({ text: `Click The Button Bellow To Enter`});
      const giveawayEnterButton = new ButtonBuilder().setCustomId('giveawayEnter').setEmoji('🎉').setStyle(ButtonStyle.Success);
      const row = new ActionRowBuilder().addComponents(giveawayEnterButton);
      const sentMessage = await foundChannel.send({
        embeds: [giveawayEmbed],
        components: [row],
      });
      const link = `https://discordapp.com/channels/${sentMessage.guild.id}/${sentMessage.channel.id}/${sentMessage.id}`;
      await Giveaway.create({
        guildId: interaction.guild.id,
        messageId: sentMessage.id,
        channelId: channel.id,
        messageTitle: message,
        winners: winners,
        requiredRole: requiredRole,  
        giveawayEnd: dateWithDuration,     
       })
      interaction.editReply(`Giveaway has been created in ${link}`)


    }
     if (subcommand === 'end' ) {
    const currentDate = new Date();
    const messageId = interaction.options.get('message-id').value
    const giveaway = await Giveaway.find({ messageId: messageId, ended: false });
    if (giveaway.length > 0) {
       } else {
        interaction.editReply({
          content: "That giveaway doesnt exist or has ended",
          ephermeral: true,
        }); 
    return;
    }
    const unixTimestamp = Math.floor(currentDate.getTime() / 1000);
    const timestamp = `<t:${unixTimestamp}:R>`;
    const discordIdCount = giveaway[0].entriesArray.length;
    let guild = interaction.guild
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
    const winners = pickRandomFromArray(giveaway[0].entriesArray, giveaway[0].winners);
    const mentionedWinners = [];
    winners.forEach(winnerId => {
      const mentionedWinner = `<@${winnerId}>`;
      mentionedWinners.push(mentionedWinner);
    });
    const mentionedWinnersString = mentionedWinners.join(' ');
    const giveawayEmbed = new EmbedBuilder()
      .setColor("#e66229")
      .setTitle(giveaway[0].messageTitle)
      .setDescription(
        `Winners: ${mentionedWinnersString}\nEntries: ${discordIdCount}\n Ended: ${timestamp}`
      )
      .setFooter({ text: `/giveaway reroll to reroll` });
    const giveawayEnterButton = new ButtonBuilder()
      .setCustomId("giveawayEnter")
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(giveawayEnterButton);
    if (guild) {
      const channel = guild.channels.cache.get(giveaway[0].channelId);
      const message = await channel.messages.fetch(giveaway[0].messageId);
      message.edit({
        embeds: [giveawayEmbed],
        components: []
      }).catch((err) => {console.log("error while sending message for giveaway enter:", err)});
    }
    giveaway[0].ended = true
    giveaway[0].endedDate = currentDate
    giveaway[0].save();
    interaction.editReply("Giveaway has been ended")
    
     }
     if (subcommand === 'reroll' ) {
     }
     if (subcommand === 'delete' ) {
    }
    },
    // devOnly: Boolean,
    //testOnly: true,
    // options: Object[],
    // deleted: Boolean,
  };
  