const {Client,Interaction,TextInputStyle,TextInputBuilder,StringSelectMenuOptionBuilder,ModalBuilder,ChannelSelectMenuBuilder,ComponentType,SlashCommandBuilder,PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder} = require('discord.js');
const Welcome = require("../../models/Welcome");
module.exports = {
    data: new SlashCommandBuilder()
    .setName('welcome-setup')
    .setDescription('Welcome people in a channel when they join the server.'),
   
    run: async ({ interaction, client, handler }) => {
      if (!interaction.inGuild()) {interaction.reply({content: "You can only run this command in a server.",ephemeral: true,});
       return;
      }
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            interaction.reply({content: 'Only server admins can run this comamand', ephemeral: true})
            return;
         }   
          await interaction.deferReply();
          const welcome = await Welcome.findOne({ guildId: interaction.guild.id }); //check the db for the guild id

          // button creation
          const setupButton = new ButtonBuilder().setLabel("Setup").setStyle(ButtonStyle.Secondary).setCustomId("welcomeSetupButton0");
          const easySetupButton = new ButtonBuilder().setLabel("Easy-Setup").setStyle(ButtonStyle.Success).setCustomId("welcomeEasySetupButton0");
          const automaticSetupButton = new ButtonBuilder().setLabel("Automatic-Setup").setStyle(ButtonStyle.Primary).setCustomId("welcomeAutomaticSetupButton0");
          const disableButton = new ButtonBuilder().setLabel("Disable").setStyle(ButtonStyle.Danger).setCustomId("welcomeDisableButton0");
          const cancelButton = new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Danger).setCustomId("welcomeCancelButton0");
          const backButton = new ButtonBuilder().setLabel("Back").setStyle(ButtonStyle.Danger).setCustomId("welcomeBackButton0");
          const backButtonRow = new ActionRowBuilder().addComponents(backButton);
      
          //embed for setup step 0
          const welcomeEmbed0 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Welcome Setup")
            .setDescription(
              `Welcome to the welcome setup please select one option\n
             Easy Setup: A simple setup with some customizability.\n
             Automatic Setup: A preset with no user input.\n
             Setup: Customise everything to your specification.`
            );
      
          let MessageReply;
          if (welcome) {
            // if welcome is enabled it will show this embed instead
            const welcomeDisableEmbed0 = new EmbedBuilder()
              .setColor("#e66229")
              .setTitle("Welcome Setup")
              .setDescription(
                `Welcome has already been setup in this server\n
                Would you like to change or disable welcomes? \n
                If so click disable and run this command again if you want to change it`
              )
              .setFooter({ text: "*does not delete channels*" });
            const welcomeRow0 = new ActionRowBuilder().addComponents(disableButton,cancelButton);
            MessageReply = await interaction.editReply({
              embeds: [welcomeDisableEmbed0],
              components: [welcomeRow0],
            });
          } else {
            //if its not setup it will run this
            const welcomeRow0 = new ActionRowBuilder().addComponents(easySetupButton,automaticSetupButton,setupButton, cancelButton);
            MessageReply = await interaction.editReply({
              embeds: [welcomeEmbed0],
              components: [welcomeRow0],
            });
          }
      
          // easy setup
          const handleEasySetupStep = async (step, data) => {
            switch (step) {
              case 1:
                const easySetupEmbed1 = new EmbedBuilder()
                  .setColor("#e66229")
                  .setTitle("Welcome Easy Setup - Step 1")
                  .setDescription(
                    `Please pick the channel you would like welcome messages to be sent in.
                    `
                  );
      
                  const easyChannelSelect1 = new ChannelSelectMenuBuilder()
                  .setCustomId('welcomeEasySetupSelectChannel1')
                  .setPlaceholder('Select a channel.')
                  .setMaxValues(1).addChannelTypes(ChannelType.GuildText);
      
                const easySetupRow1 = new ActionRowBuilder().addComponents(easyChannelSelect1);
                await interaction.editReply({embeds: [easySetupEmbed1], components: [easySetupRow1],
      
                });
                break;
              case 2:
      
                const easySetupEmbed2 = new EmbedBuilder()
                  .setColor("#e66229")
                  .setTitle("Welcome Easy Setup - Step 2")
                  .setDescription(`Please pick what types of messages you would like.`);
                  await interaction.editReply({embeds: [easySetupEmbed2], components: [],}); // fixes bug where select menu shows the previous selected option
                  const easyTypeSelect2 = new StringSelectMenuBuilder()
                  .setCustomId('welcomeEasySetupSelectType2')
                  .setPlaceholder('Select a types.')
                  .addOptions(
                    new StringSelectMenuOptionBuilder()
                      .setLabel('Join Messages')
                      .setDescription('Sends a message when someone joins.')
                      .setValue('joinMessage'),
                    new StringSelectMenuOptionBuilder()
                      .setLabel('Leave Messages')
                      .setDescription('Sends a message when someone leaves.')
                      .setValue('leaveMessage'),
                    new StringSelectMenuOptionBuilder()
                      .setLabel('Ban Messages')
                      .setDescription('Sends a message when someone is banned.')
                      .setValue('banMessage'),
                  )
                  .setMaxValues(3);
                const easySetupRow2 = new ActionRowBuilder().addComponents(easyTypeSelect2);
                interaction.editReply({
                  embeds: [easySetupEmbed2],
                  components: [easySetupRow2,backButtonRow],
                });
                break;
              case 3:
                const channel = interaction.guild.channels.cache.get(data.channel);
                const type = data.type.join(', ');
                const easySetupEmbed3 = new EmbedBuilder()
                  .setColor("#e66229")
                  .setTitle("Welcome Easy Setup - Step 3")
                  .setDescription(`Are these settings correct?\n
                  Welcome messages will be sent in ${channel}, you have enabled: **${type}**.\n
                  Welcome message: ${data.welcomeMessage}\n
                  Leave Message: ${data.leaveMessage}\n
                  Ban Message: ${data.banMessage}\n
                  *Only the types you have selected will be used.* 
                  *If you would like to change the name, select setup at the start*`);
                const easySetupNext3 = new ButtonBuilder()
                  .setLabel("Confirm")
                  .setStyle(ButtonStyle.Success)
                  .setCustomId("welcomeEasySetupButton3");
                const easySetupRow3 = new ActionRowBuilder().addComponents(easySetupNext3,backButton);
                MessageReply.edit({
                  embeds: [easySetupEmbed3],
                  components: [easySetupRow3],
                });
                break;
              case 4:
                const Channel4 = interaction.guild.channels.cache.get(data.channel);
                const easySetupEmbed4 = new EmbedBuilder()
                  .setColor("#e66229")
                  .setTitle("Welcome Easy Setup - Step 4")
                  .setDescription(`You finished the setup, Welcome messages will be sent in ${Channel4}. \n If you would like to disable welcomes run this command again.`);
                MessageReply.edit({ embeds: [easySetupEmbed4], components: [] });
                break;
              default:
                break;
            }
          };
      
      
          // normal setup
          const handleSetupStep = async (step) => {
            switch (step) {
              case 1:
                const SetupEmbed1 = new EmbedBuilder()
                  .setColor("#e66229")
                  .setTitle("Welcome Setup - Step 1")
                  .setDescription(
                    `Please pick the channel you would like welcome messages to be sent in.
                    `);
                    const ChannelSelect1 = new ChannelSelectMenuBuilder()
                    .setCustomId('welcomeSetupSelectChannel1')
                    .setPlaceholder('Select a channel.')
                    .setMaxValues(1).addChannelTypes(ChannelType.GuildText);
                const SetupRow1 = new ActionRowBuilder().addComponents(ChannelSelect1);
                MessageReply.edit({embeds: [SetupEmbed1],components: [SetupRow1],});
                break;
              case 2:
                const SetupEmbed2 = new EmbedBuilder()
                  .setColor("#e66229")
                  .setTitle("Welcome Setup - Step 2")
                  .setDescription(
                    `Please pick what types of messages you would like.`
                  );
                  await interaction.editReply({embeds: [SetupEmbed2], components: [],}); // fixes bug where select menu shows the previous selected option
                  const TypeSelect2 = new StringSelectMenuBuilder()
                  .setCustomId('welcomeSetupSelectType2')
                  .setPlaceholder('Select a types.')
                  .addOptions(
                    new StringSelectMenuOptionBuilder()
                      .setLabel('Join Messages')
                      .setDescription('Sends a message when someone joins.')
                      .setValue('joinMessage'),
                    new StringSelectMenuOptionBuilder()
                      .setLabel('Leave Messages')
                      .setDescription('Sends a message when someone leaves.')
                      .setValue('leaveMessage'),
                    new StringSelectMenuOptionBuilder()
                      .setLabel('Ban Messages')
                      .setDescription('Sends a message when someone is banned.')
                      .setValue('banMessage'),
                  )
                  .setMaxValues(3);
                const SetupRow2 = new ActionRowBuilder().addComponents(TypeSelect2);
                interaction.editReply({
                  embeds: [SetupEmbed2],
                  components: [SetupRow2,backButtonRow],
                });
                break;
              case 3:
                const SetupEmbed3 = new EmbedBuilder()
                  .setColor("#e66229")
                  .setTitle("Welcome Setup - Step 3")
                  .setDescription(`
                  This will be the message the bot sends when someone joins/leaves/banned, If you have only selected join messages ignore the rest of the inputs 
                  \n(user) to ping the user | (server) for the server name | eg: (user) has joined (server)
                  \n Click the text button when your ready.`
                  );
                  const SetupNext3 = new ButtonBuilder().setLabel("Text").setStyle(ButtonStyle.Primary).setCustomId("welcomeSetupButton3");
                  const SetupRow3 = new ActionRowBuilder().addComponents(SetupNext3,backButton);
                  MessageReply.edit({embeds: [SetupEmbed3],components: [SetupRow3]});
                break;
              case 4:
                const modal = new ModalBuilder({
                  custom_id: `welcomeModal-${interaction.user.id}`,
                  title: "Welcome name",
                });
                const setupWelcomeInput4 = new TextInputBuilder({
                  custom_id: "welcomeInput",
                  label: `Welcome Message. e.g:(user) joined (server)`,
                  style: TextInputStyle.Short,
                });
                const setupLeaveInput4 = new TextInputBuilder({
                  custom_id: "leaveInput",
                  label: `Leave Message. e.g: (user) left (server)`,
                  style: TextInputStyle.Short,
                });
                const setupBanInput4 = new TextInputBuilder({
                  custom_id: "banInput",
                  label: `Ban Message. e.g: (user) has been banned`,
                  style: TextInputStyle.Short,
                });
                const SetupEmbed4 = new EmbedBuilder()
                .setColor("#e66229")
                .setTitle("Welcome Setup - Step 4")
                .setDescription(`
                Awaiting Response...\n
                If you clicked cancel please go back and try again,`
                );
                const SetupRow4 = new ActionRowBuilder().addComponents(backButton);
                const SetupModalRow1 = new ActionRowBuilder().addComponents(setupWelcomeInput4);
                const SetupModalRow2 = new ActionRowBuilder().addComponents(setupLeaveInput4);
                const SetupModalRow3 = new ActionRowBuilder().addComponents(setupBanInput4);
                MessageReply.edit({embeds: [SetupEmbed4],components: [SetupRow4],});
                modal.addComponents(SetupModalRow1,SetupModalRow2,SetupModalRow3);
                return modal
                break;
                case 5:
                  const channel = interaction.guild.channels.cache.get(data.channel);
                  const type = data.type.join(', ');
                  const SetupEmbed5 = new EmbedBuilder()
                    .setColor("#e66229")
                    .setTitle("Welcome Easy Setup - Step 3")
                    .setDescription(`Are these settings correct?\n
                    Welcome messages will be sent in ${channel}, you have enabled: **${type}**.\n
                    Welcome message: ${data.welcomeMessage}\n
                    Leave Message: ${data.leaveMessage}\n
                    Ban Message: ${data.banMessage}\n
                    *Only the types you have selected will be used.*`);
                  const SetupNext5 = new ButtonBuilder()
                    .setLabel("Confirm")
                    .setStyle(ButtonStyle.Success)
                    .setCustomId("welcomeSetupButton5");
                  const easySetupRow5 = new ActionRowBuilder().addComponents(SetupNext5,backButton);
                  MessageReply.edit({
                    embeds: [SetupEmbed5],
                    components: [easySetupRow5],
                  });
                  break;
                  case 6:
                    const Channel6 = interaction.guild.channels.cache.get(data.channel);
                    const SetupEmbed6 = new EmbedBuilder()
                      .setColor("#e66229")
                      .setTitle("Welcome Setup - Step 6")
                      .setDescription(
                        `You finished the setup, Welcome messages will be sent in ${Channel6}. \n If you would like to disable welcomes run this command again.`
                      );
                      MessageReply.edit({embeds: [SetupEmbed6],components: [],});
                    break;
      
      
              default:
                break;
            }
          };
      
          const filter = (i) => i.user.id === interaction.user.id;
          const messageCollector = MessageReply.createMessageComponentCollector({
            ComponentType: [ComponentType.Button, ComponentType.ChannelSelect, ComponentType.TextInput],
            filter: filter,
            time: 300_000,
          }); // start the message collector
      
      
          let isCollectorActive = true;
          let type = null; //the choice of setup, easySetup | setup | automatic
          let currentStep = 0;
          let data = {
            guildId: interaction.guild.id,
            channel: null,
            type: [],
            welcomeMessage: null,
            banMessage: null,
            leaveMessage: null,
          };
      
          //triggers whenever the user clicks a button
          messageCollector.on("collect", async (interaction) => {
            if (interaction.customId === `welcomeSetupButton3`) {
              
            } else {
              interaction.deferUpdate();
            }
            messageCollector.resetTimer();
      
            // numbers after the custom id represent the current step
      
            //normal setup
            if (interaction.customId === "welcomeSetupButton0") {
              type = "setup"
              currentStep = 1;
              handleSetupStep(1, data);
            }
            if (interaction.customId === "welcomeSetupSelectChannel1") {
              currentStep = 2;
              data.channel = interaction.values[0];
              handleSetupStep(2, data);
            }
            if (interaction.customId === "welcomeSetupSelectType2") {
              currentStep = 3;
              data.type = interaction.values;
              handleSetupStep(3, data);
            }
            if (interaction.customId === `welcomeSetupButton3`) {
              currentStep = 4;
              modal = await handleSetupStep(4, data);
              interaction.showModal(modal)
              handleSetupStep(4, data);
      
      
              const Modalfilter = (interaction) => //step 4
              interaction.customId === `welcomeModal-${interaction.user.id}`;
            interaction.awaitModalSubmit({ Modalfilter, time: 300_000 })
              .then((modalInteraction) => {
                  tempWelcome = modalInteraction.fields.getTextInputValue("welcomeInput");
                  tempWelcome.replace(/\(SERVER\)/g, "(server)");
                  data.welcomeMessage = tempWelcome.replace(/\(USER\)/g, "(user)");

                  tempLeave = modalInteraction.fields.getTextInputValue("leaveInput");
                  tempLeave.replace(/\(SERVER\)/g, "(server)");
                  data.leaveMessage = tempLeave.replace(/\(USER\)/g, "(user)");

                  tempBan = modalInteraction.fields.getTextInputValue("banInput");
                  tempBan.replace(/\(SERVER\)/g, "(server)");
                  data.banMessage = tempBan.replace(/\(USER\)/g, "(user)");
                  currentStep = 5;
                  modalInteraction.deferUpdate().catch((err) => {
                    console.log(err);
                  });
                  handleSetupStep(5, data).catch((err) => {
                    console.log(err);
                  });
      
              })
              .catch((err) => {
                console.log(err);
              });
            }
      
            if (interaction.customId === "welcomeSetupButton5") {
                await Welcome.create({
                guildId: interaction.guild.id,
                channel: data.channel,
                typeArray: data.type,
                welcomeMessage: data.welcomeMessage,  
                banMessage: data.banMessage,     
                leaveMessage: data.leaveMessage,
              }).catch((err) => {console.error(`error while saving welcome: ${err}`)});
              currentStep = 6;
              await handleSetupStep(6, data);
              isCollectorActive = false;
              return;
            }
      
           //easy setup
            if (interaction.customId === "welcomeEasySetupButton0") {
              type = "easy"
              currentStep = 1;
              handleEasySetupStep(1, data);
            }
            if (interaction.customId === "welcomeEasySetupSelectChannel1") {
              currentStep = 2;
              data.channel = interaction.values[0];
              handleEasySetupStep(2, data);
            }
            if (interaction.customId === "welcomeEasySetupSelectType2") {
              currentStep = 3;
              data.type = interaction.values;
              data.welcomeMessage = "Welcome (user) to (server)!"
              data.banMessage = '(user) has been banned from (server)!'
              data.leaveMessage = '(user) has left (server).'
      
              handleEasySetupStep(3, data);
            }
            if (interaction.customId === "welcomeEasySetupButton3") {
              currentStep = 4;
              Welcome.create({
                guildId: interaction.guild.id,
                channel: data.channel,
                typeArray: data.type,
                welcomeMessage: data.welcomeMessage,  
                banMessage: data.banMessage,     
                leaveMessage: data.leaveMessage,
              }).catch((err) => {console.error(`error while saving welcome: ${err}`)});
              await handleEasySetupStep(4, data);
              isCollectorActive = false;
              return;
            }
      
            //back button
            if (interaction.customId === "welcomeBackButton0") {
              if (type === "easy") {
             if(currentStep === 2) {
              data.category = null;
              handleEasySetupStep(1, data);
              currentStep = 1;
             }
             if(currentStep === 3) {
              data.name = null;
              data.source = null;
              handleEasySetupStep(2, data);
              currentStep = 2;
             }
             if(currentStep === 4) {
              handleEasySetupStep(3, data);
              currentStep = 3;
             }
            } 
            if (type === "setup") {
              if(currentStep === 2) {
                data.category = null;
                handleSetupStep(1, data);
                currentStep = 1;
              }
              if(currentStep === 3) {
                data.source = null;
                handleSetupStep(2, data);
                currentStep = 2;
              }
              if(currentStep === 4) {
                handleSetupStep(3, data);
                currentStep = 3;
      
              }
              if(currentStep === 5) {
                handleSetupStep(3, data);
                currentStep = 3;
                data.name = null;
              }
              
            }
      
            }
      
            //automatic setup
            if (interaction.customId === "welcomeAutomaticSetupButton0") {
              if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                const welcomeNoPermsEmbed = new EmbedBuilder()
                .setColor("#e66229")
                .setTitle("Welcome Auto Setup")
                .setDescription(`Hey there... Autosetup requires Manage Channels permissions, Since it creates channels when setting up.`);
                MessageReply.edit({
                  embeds: [welcomeNoPermsEmbed],
                });
               return;
              }
              const welcomeAutoEmbed1 = new EmbedBuilder()
              .setColor("#e66229")
              .setTitle("Welcome Auto Setup")
              .setDescription(`Creating channels...`);
              await MessageReply.edit({
                embeds: [welcomeAutoEmbed1],
                components: [],
              });
      
              const createdChannel = await interaction.guild.channels.create({
                name: "welcome",
                type: ChannelType.GuildText,
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                  },
                ],
              });
              Welcome.create({
                guildId: interaction.guild.id,
                channel: createdChannel,
                type: ["leaveMessage","banMessage","joinMessage"],
                welcomeMessage: `Welcome (user) to (server)!`,  
                banMessage: '(user) has been banned from (server)!',     
                leaveMessage: '(user) has left (server).',
              }).catch((err) => {console.error(`error while saving welcome: ${err}`)});
              const welcomeAutoEmbed2 = new EmbedBuilder()
                .setColor("#e66229")
                .setTitle("Welcome Auto Setup")
                .setDescription(`You finished the setup, All welcome messages will be sent in ${createdChannel}, You can move or rename the channel if you want.\n If you would like to disable welcomes run this command again.`);
              await MessageReply.edit({
                embeds: [welcomeAutoEmbed2],
                components: [],
              });
            }
      
            //disable
            if (interaction.customId === "welcomeDisableButton0") {
              const welcomeDisableEmbed1 = new EmbedBuilder()
                .setColor("#e66229")
                .setTitle("Welcome Setup")
                .setDescription(
                  `You have disabled welcome\n
                    Run this command again to set it up again`
                );
              await Welcome.findOneAndDelete({ guildId: interaction.guild.id });
              await MessageReply.edit({
                embeds: [welcomeDisableEmbed1],
                components: [],
              });
              return;
            }
            //cancel
            if (interaction.customId === "welcomeCancelButton0") {
              await messageCollector.empty();
              isCollectorActive = false;
              await MessageReply.delete();
            }
          });
          
          //if the user has not responded in 5 min
          messageCollector.on("end", () => {
            if (isCollectorActive === true) {
              const tookToLongEmbed = new EmbedBuilder()
              .setColor("#e66229")
              .setTitle("Welcome Setup")
              .setDescription(
                `Oh no.. You have taken too long to respond.\n
                  Run this command again to retry`
              );
              MessageReply.edit({
                embeds: [tookToLongEmbed],components: [],
              });
            }
          });
    },
    // devOnly: Boolean,
    //testOnly: true,
    // options: Object[],
    // deleted: true,
  };
  