const {Client,Interaction,SlashCommandBuilder,TextInputStyle,TextInputBuilder,ModalBuilder,ChannelSelectMenuBuilder,PermissionsBitField,ChannelType,EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,ComponentType,MessageCollector,} = require("discord.js");
const AutoRoom = require("../../models/AutoRoom");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoroom-setup")
    .setDescription(
      "Setup or disable autoroom system, Creates personal voice channels"
    ),

  run: async ({ interaction, client, handler }) => {                                                   //*three way split depending on the choice*
    /*code structure                                                                                    |-> if user chose autosetup -> creates channels and settings based on a preset  -> saves settings to db                                                          
    interaction -> sends setup embed or sends disable embed(if already enabled) -> starts collector -> -|-> if user chose setup -> runs handleSetupStep(1, data); -> asks the user what catagory they want channels to be created in -> saves the catagory as data.catagory -> asks for source channel -> saves it as data.source, sets the name to a default name data.name -> asks for comfirmation of settings -> saves data to db
.                                                                                                       |-> if user chose easysetup -> runs handleEasySetupStep(1, data); -> asks the user what catagory they want channels to be created in ->saves the catagory as data.catagory -> asks for source channel -> saves it as data.source -> askes the user for name -> saves as data.name -> asks for comfirmation of settings -> saves data to db
   hope this helps visualise the code structure. If not just read ¯\_(ツ)_/¯, sorry if my code is unreadable :)  */

    await interaction.deferReply();
    //permissions
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return await interaction.editreply({
        content: "Only server admins can run this comamand",
        ephemeral: true,
      });
    if (!PermissionsBitField.Flags.ManageChannels)
      return await interaction.editreply({
        content: "To use this feature please give me manageChannels permission",
        ephemeral: true,
      });
    if (!interaction.inGuild())
      return await interaction.editreply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });

    const autoroom = await AutoRoom.findOne({ guildId: interaction.guild.id }); //check the db for the guild id

    // button creation
    const setupButton = new ButtonBuilder().setLabel("Setup").setStyle(ButtonStyle.Secondary).setCustomId("autoroomSetupButton0");
    const easySetupButton = new ButtonBuilder().setLabel("Easy-Setup").setStyle(ButtonStyle.Success).setCustomId("autoroomEasySetupButton0");
    const automaticSetupButton = new ButtonBuilder().setLabel("Automatic-Setup").setStyle(ButtonStyle.Primary).setCustomId("autoroomAutomaticSetupButton0");
    const disableButton = new ButtonBuilder().setLabel("Disable").setStyle(ButtonStyle.Danger).setCustomId("autoroomDisableButton0");
    const cancelButton = new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Danger).setCustomId("autoroomCancelButton0");
    const backButton = new ButtonBuilder().setLabel("Back").setStyle(ButtonStyle.Danger).setCustomId("autoroomBackButton0");
    const backButtonRow = new ActionRowBuilder().addComponents(backButton);

    //embed for setup step 0
    const autoroomEmbed0 = new EmbedBuilder()
      .setColor("#e66229")
      .setTitle("Autoroom Setup")
      .setDescription(
        `Welcome to the autoroom setup please select one option\n
       Easy Setup: A simple setup with some customizability.\n
       Automatic Setup: A preset with no user input.\n
       Setup: Customise everything to your specification.`
      );

    let MessageReply;
    if (autoroom) {
      // if autoroom is enabled it will show this embed instead
      const autoroomDisableEmbed0 = new EmbedBuilder()
        .setColor("#e66229")
        .setTitle("Autoroom Setup")
        .setDescription(
          `Autoroom has already been setup in this server\n
          Would you like to change or disable autorooms? \n
          If so click disable and run this command again if you want to change it`
        )
        .setFooter({ text: "*does not delete channels*" });
      const autoroomRow0 = new ActionRowBuilder().addComponents(disableButton,cancelButton);
      MessageReply = await interaction.editReply({
        embeds: [autoroomDisableEmbed0],
        components: [autoroomRow0],
      });
    } else {
      //if its not setup it will run this
      const autoroomRow0 = new ActionRowBuilder().addComponents(easySetupButton,automaticSetupButton,setupButton, cancelButton);
      MessageReply = await interaction.editReply({
        embeds: [autoroomEmbed0],
        components: [autoroomRow0],
      });
    }

    // easy setup
    const handleEasySetupStep = async (step, data) => {
      switch (step) {
        case 1:
          const easySetupEmbed1 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Autoroom Easy Setup - Step 1")
            .setDescription(
              `Please pick the category you want autorooms to be created in \n
              *When users join the "Click To Create A VC" channel this will be the category there room is created in.*
              `
            );

            const easyChannelSelect1 = new ChannelSelectMenuBuilder()
            .setCustomId('autoroomEasySetupSelectCategory1')
            .setPlaceholder('Select a channel.')
            .setMaxValues(1).addChannelTypes(ChannelType.GuildCategory);

          const easySetupRow1 = new ActionRowBuilder().addComponents(easyChannelSelect1);
          await interaction.editReply({embeds: [easySetupEmbed1], components: [easySetupRow1],

          });
          break;
        case 2:

          const easySetupEmbed2 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Autoroom Easy Setup - Step 2")
            .setDescription(`Please pick the channel users will join to create there autorooms \n 
            *If you havent created a channel please create one and select it, This will be the channel users join to create there autorooms*`);
            await interaction.editReply({embeds: [easySetupEmbed2], components: [],}); // fixes bug where select menu shows the previous selected option
            const easyChannelSelect2 = new ChannelSelectMenuBuilder()
            .setCustomId('autoroomEasySetupSelectVoiceChannel2')
            .setPlaceholder('Select a channel.')
            .setMaxValues(1).addChannelTypes(ChannelType.GuildVoice);
          const easySetupRow2 = new ActionRowBuilder().addComponents(easyChannelSelect2);
          interaction.editReply({
            embeds: [easySetupEmbed2],
            components: [easySetupRow2,backButtonRow],
          });
          break;
        case 3:
          const sourceChannel = interaction.guild.channels.cache.get(data.source);
          const categoryName = interaction.guild.channels.cache.get(data.category).name;
          const easySetupEmbed3 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Autoroom Easy Setup - Step 3")
            .setDescription(`Are these settings correct?\n
            Users will join ${sourceChannel} to create their autorooms, which are named **${data.name}**, When they join there rooms will be created in #${categoryName} category.\n
            *If you would like to change the name, select setup at the start*`);
          const easySetupNext3 = new ButtonBuilder()
            .setLabel("Confirm")
            .setStyle(ButtonStyle.Success)
            .setCustomId("autoroomEasySetupButton3");
          const easySetupRow3 = new ActionRowBuilder().addComponents(easySetupNext3,backButton);
          MessageReply.edit({
            embeds: [easySetupEmbed3],
            components: [easySetupRow3],
          });
          break;
        case 4:
          const sourceChannel4 = interaction.guild.channels.cache.get(data.source);
          const easySetupEmbed4 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Autoroom Easy Setup - Step 4")
            .setDescription(`You finished the setup, Join ${sourceChannel4} to create your autoroom. \n If you would like to disable autorooms run this command again.`);
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
            .setTitle("Autoroom Setup - Step 1")
            .setDescription(
              `Please pick the category you want autorooms to be created in \n
              *When users join the "Click To Create A VC" channel this will be the category there room is created in.*
              `);
              const ChannelSelect1 = new ChannelSelectMenuBuilder()
              .setCustomId('autoroomSetupSelectCategory1')
              .setPlaceholder('Select a channel.')
              .setMaxValues(1).addChannelTypes(ChannelType.GuildCategory);
          const SetupRow1 = new ActionRowBuilder().addComponents(ChannelSelect1);
          MessageReply.edit({embeds: [SetupEmbed1],components: [SetupRow1],});
          break;
        case 2:
          const SetupEmbed2 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Autoroom Setup - Step 2")
            .setDescription(
              `Please pick the channel users will join to create there autorooms \n 
            *If you havent created a channel please create one and select it, This will be the channel users join to create there autorooms*`
            );
            await interaction.editReply({embeds: [SetupEmbed2], components: [],}); // fixes bug where select menu shows the previous selected option
            const ChannelSelect2 = new ChannelSelectMenuBuilder()
            .setCustomId('autoroomSetupSelectVoiceChannel2')
            .setPlaceholder('Select a channel.')
            .setMaxValues(1).addChannelTypes(ChannelType.GuildVoice);
          const SetupRow2 = new ActionRowBuilder().addComponents(ChannelSelect2);
          MessageReply.edit({embeds: [SetupEmbed2],components: [SetupRow2,backButtonRow],});
          break;
        case 3:
          const SetupEmbed3 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Autoroom Setup - Step 3")
            .setDescription(`
            This will be the users room when they join the source channel(the channel people join to create there rooms),\n
            Please click the text button when your ready.`
            );
            const SetupNext3 = new ButtonBuilder().setLabel("Text").setStyle(ButtonStyle.Primary).setCustomId("autoroomSetupButton3");
            const SetupRow3 = new ActionRowBuilder().addComponents(SetupNext3,backButton);
            MessageReply.edit({embeds: [SetupEmbed3],components: [SetupRow3]});
          break;
        case 4:
          const modal = new ModalBuilder({
            custom_id: `autoroomModal-${interaction.user.id}`,
            title: "Autoroom name",
          });
          const setupInput4 = new TextInputBuilder({
            custom_id: "nameInput",
            label: `(user) = There Username. e.g: (user)'s room  `,
            style: TextInputStyle.Short,
          });
          const SetupEmbed4 = new EmbedBuilder()
          .setColor("#e66229")
          .setTitle("Autoroom Setup - Step 4")
          .setDescription(`
          Awaiting Response...\n
          If you clicked cancel please go back and try again,`
          );
          const SetupRow4 = new ActionRowBuilder().addComponents(backButton);
          const SetupModalRow4 = new ActionRowBuilder().addComponents(setupInput4);
          MessageReply.edit({embeds: [SetupEmbed4],components: [SetupRow4],});
          modal.addComponents(SetupModalRow4);
          return modal
          break;
          case 5:
            const sourceChannel = interaction.guild.channels.cache.get(data.source);
            const categoryName = interaction.guild.channels.cache.get(data.category).name;
            const SetupEmbed5 = new EmbedBuilder()
              .setColor("#e66229")
              .setTitle("Autoroom Setup - Step 5")
              .setDescription(
                `Are these settings correct?\n
                 Users will join ${sourceChannel} to create their autorooms, which are named **${data.name}**,
                 When they join the source channel rooms will be created in **#${categoryName}** category.`
              );
              const SetupNext5 = new ButtonBuilder().setLabel("Confirm").setStyle(ButtonStyle.Success).setCustomId("autoroomSetupButton5");
              const SetupRow5 = new ActionRowBuilder().addComponents(SetupNext5 ,backButton);
              MessageReply.edit({embeds: [SetupEmbed5],components: [SetupRow5],});
            break;
            case 6:
              const sourceChannel6 = interaction.guild.channels.cache.get(data.source);
              const SetupEmbed6 = new EmbedBuilder()
                .setColor("#e66229")
                .setTitle("Autoroom Setup - Step 6")
                .setDescription(
                  `You finished the setup, Join ${sourceChannel6} to create your autoroom. \n If you would like to disable autorooms run this command again.`
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
      source: null,
      category: null,
      name: null,
    };

    //triggers whenever the user clicks a button
    messageCollector.on("collect", async (interaction) => {
      if (interaction.customId === `autoroomSetupButton3`) {
        
      } else {
        interaction.deferUpdate();
      }
      messageCollector.resetTimer();

      // numbers after the custom id represent the current step

      //normal setup
      if (interaction.customId === "autoroomSetupButton0") {
        type = "setup"
        currentStep = 1;
        handleSetupStep(1, data);
      }
      if (interaction.customId === "autoroomSetupSelectCategory1") {
        currentStep = 2;
        data.category = interaction.values[0];
        handleSetupStep(2, data);
      }
      if (interaction.customId === "autoroomSetupSelectVoiceChannel2") {
        currentStep = 3;
        data.source = interaction.values[0];
        handleSetupStep(3, data);
      }
      if (interaction.customId === `autoroomSetupButton3`) {
        currentStep = 4;
        modal = await handleSetupStep(4, data);
        interaction.showModal(modal)
        handleSetupStep(4, data);


        const Modalfilter = (interaction) => //step 4
        interaction.customId === `autoroomModal-${interaction.user.id}`;
      interaction.awaitModalSubmit({ Modalfilter, time: 300_000 })
        .then((modalInteraction) => {
            tempName = modalInteraction.fields.getTextInputValue("nameInput");
            data.name = tempName.replace(/\(USER\)/g, "(user)");
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

      if (interaction.customId === "autoroomSetupButton5") {
        await AutoRoom.create({
          guildId: data.guildId,
          category: data.category,
          source: data.source,
          channelName: data.name,
        }).catch((err) => {
          console.log(`AutoRoom Setup Error: ${err}`);
        });;
        currentStep = 6;
        await handleSetupStep(6, data);
        isCollectorActive = false;
        return;
      }

     //easy setup
      if (interaction.customId === "autoroomEasySetupButton0") {
        type = "easy"
        currentStep = 1;
        handleEasySetupStep(1, data);
      }
      if (interaction.customId === "autoroomEasySetupSelectCategory1") {
        currentStep = 2;
        data.category = interaction.values[0];
        handleEasySetupStep(2, data);
      }
      if (interaction.customId === "autoroomEasySetupSelectVoiceChannel2") {
        currentStep = 3;
        data.source = interaction.values[0];
        data.name = "(user)'s Room"

        handleEasySetupStep(3, data);
      }
      if (interaction.customId === "autoroomEasySetupButton3") {
        currentStep = 4;
        AutoRoom.create({
          guildId: data.guildId,
          category: data.category,
          source: data.source,
          channelName: data.name,
        });
        await handleEasySetupStep(4, data);
        isCollectorActive = false;
        return;
      }

      //back button
      if (interaction.customId === "autoroomBackButton0") {
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
      if (interaction.customId === "autoroomAutomaticSetupButton0") {
        const autoroomAutoEmbed1 = new EmbedBuilder()
        .setColor("#e66229")
        .setTitle("Autoroom Auto Setup")
        .setDescription(`Creating channels...`);
        await MessageReply.edit({
          embeds: [autoroomAutoEmbed1],
          components: [],
        });

        const createdCategory = await interaction.guild.channels.create({
          name: "AutoRoom",
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              allow: [PermissionsBitField.Flags.ViewChannel],
            },
          ],
        });
        const createdChannel = await interaction.guild.channels.create({
          name: "Click To Create A VC",
          type: ChannelType.GuildVoice,
          parent: createdCategory.id,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              allow: [PermissionsBitField.Flags.ViewChannel],
            },
          ],
        });
        AutoRoom.create({
          guildId: interaction.guild.id,
          category: createdCategory.id,
          source: createdChannel.id,
          channelName: "(user)'s Room",
        }).catch((err) => {console.error("error while saving autoroom")});
        const autoroomAutoEmbed2 = new EmbedBuilder()
          .setColor("#e66229")
          .setTitle("Autoroom Auto Setup")
          .setDescription(`You finished the setup, Join ${createdChannel} to create your autoroom. \n If you would like to disable autorooms run this command again.`);
        await MessageReply.edit({
          embeds: [autoroomAutoEmbed2],
          components: [],
        });
      }

      //disable
      if (interaction.customId === "autoroomDisableButton0") {
        const autoroomDisableEmbed1 = new EmbedBuilder()
          .setColor("#e66229")
          .setTitle("Autoroom Setup")
          .setDescription(
            `You have disabled autoroom\n
              Run this command again to set it up again`
          );
        await AutoRoom.findOneAndDelete({ guildId: interaction.guild.id });
        await MessageReply.edit({
          embeds: [autoroomDisableEmbed1],
          components: [],
        });
        return;
      }
      //cancel
      if (interaction.customId === "autoroomCancelButton0") {
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
        .setTitle("Autoroom Setup")
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
  // deleted: Boolean,
};
