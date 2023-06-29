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
      interaction.reply({
        content: "You can only run this command in a server.",
        ephermeral: true,
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
        messageId: sentMessage.id,
        messageTitle: message,
        winners: winners,
        requiredRole: requiredRole,  
        giveawayEnd: dateWithDuration,     
       })
      interaction.editReply(`Giveaway has been created in ${link}`)


    }
     if (subcommand === 'end' ) {
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
  