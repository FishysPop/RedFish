const {Client,Interaction,SlashCommandBuilder,ChannelSelectMenuBuilder,PermissionsBitField,ChannelType,EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,ComponentType,MessageCollector,} = require("discord.js");
const AutoRoom = require("../../models/AutoRoom");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoroom-setup")
    .setDescription(
      "Setup a ticket system, when a user clicks a button it will create a ticket"
    ),

  run: async ({ interaction, client, handler }) => {
    await interaction.deferReply();
    //permissions
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    )
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

    // button format
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

    const filter = (i) => i.user.id === interaction.user.id;
    const messageCollector = MessageReply.createMessageComponentCollector({
      ComponentType: [ComponentType.Button, ComponentType.ChannelSelect],
      filter: filter,
      time: 300_000,
    }); // start the message collector

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

    const handleSetupStep = async (step) => {
      switch (step) {
        case 1:
          const SetupEmbed1 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Autoroom Setup - Step 1")
            .setDescription(
              `You picked "Setup." Proceed with setup steps here.`);
          const SetupNext1 = new ButtonBuilder().setLabel("Next").setStyle(ButtonStyle.Primary).setCustomId("autoroomSetupButton1");
          const SetupRow1 = new ActionRowBuilder().addComponents(SetupNext1);
          MessageReply.edit({embeds: [SetupEmbed1],components: [SetupRow1],});
          break;
        case 2:
          const SetupEmbed2 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Autoroom Setup - Step 2")
            .setDescription(
              `You picked "Setup." Proceed with setup steps here.`
            );
          const SetupNext2 = new ButtonBuilder().setLabel("Next").setStyle(ButtonStyle.Primary).setCustomId("autoroomSetupButton2");
          const SetupRow2 = new ActionRowBuilder().addComponents(SetupNext2);
          MessageReply.edit({embeds: [SetupEmbed2],components: [SetupRow2],});
          break;
        case 3:
          const SetupEmbed3 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Autoroom Setup - Step 3")
            .setDescription(
              `You picked "Setup." Proceed with setup steps here.`
            );
            const SetupNext3 = new ButtonBuilder().setLabel("Next").setStyle(ButtonStyle.Primary).setCustomId("autoroomSetupButton3");
            const SetupRow3 = new ActionRowBuilder().addComponents(SetupNext3);
            MessageReply.edit({embeds: [SetupEmbed3],components: [SetupRow3],});
          break;
        case 4:
          const SetupEmbed4 = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle("Autoroom Setup - Step 4")
            .setDescription(
              `You picked "Setup." Proceed with setup steps here.`
            );
            MessageReply.edit({embeds: [SetupEmbed4],components: [],});
          break;


        default:
          break;
      }
    };

    let isCollectorActive = true;
    let currentStep = 0;
    let data = {
      guildId: interaction.guild.id,
      source: null,
      category: null,
      name: null,
    };

    //triggers whenever the user clicks a button
    messageCollector.on("collect", async (interaction) => {
      interaction.deferUpdate();
      messageCollector.resetTimer();

      // numbers after the custom id represent the current step
      if (interaction.customId === "autoroomSetupButton0") {
        const type = "setup"
        currentStep = 1;
        handleSetupStep(1, data);
      }
      if (interaction.customId === "autoroomSetupButton1") {
        currentStep = 2;
        handleSetupStep(2, data);
      }
      if (interaction.customId === "autoroomSetupButton2") {
        const createdSourceChannel = await interaction.guild.channels.create({
          name: data.name,
          type: ChannelType.GuildVoice,
          parent: data.category,
          permissionOverwrites: [
              {
                  id: interaction.guild.id,
                  allow: [PermissionsBitField.Flags.ViewChannel],
                },
          ],
      });
        currentStep = 3;
        handleSetupStep(3, data);
      }
      if (interaction.customId === "autoroomSetupButton3") {
        currentStep = 4;
        handleSetupStep(4, data);
      }

      if (interaction.customId === "autoroomEasySetupButton0") {
        const type = "easySetup"
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
        handleEasySetupStep(4, data);

      }

      //back button
      if (interaction.customId === "autoroomBackButton0") {
        if (type === easySetup) {
       if(currentStep === 2) {
        delete selectedCategory;
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
      } else {
          
      }

      }

      if (interaction.customId === "autoroomAutomaticSetupButton0") {
        const autoroomDisableEmbed1 = new EmbedBuilder()
          .setColor("#e66229")
          .setTitle("Autoroom Setup")
          .setDescription(`You picked automatic setup`);
        await MessageReply.edit({
          embeds: [autoroomDisableEmbed1],
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

    if (interaction.customId === "openModalButton") {
      const modal = new ModalBuilder({
        custom_id: `testModal-${interaction.user.id}`,
        title: "Test",
      });
      const testInput = new TextInputBuilder({
        custom_id: "testInput",
        label: "test?",
        style: TextInputStyle.Short,
      });
      const testerInput = new TextInputBuilder({
        custom_id: "testerInput",
        label: "Do You Like Tests?",
        style: TextInputStyle.Paragraph,
      });
      const firstRow = new ActionRowBuilder().addComponents(testInput);
      const secondRow = new ActionRowBuilder().addComponents(testerInput);
      modal.addComponents(firstRow, secondRow);
      await interaction.showModal(modal);

      const filter = (interaction) =>
        interaction.customId === `testModal-${interaction.user.id}`;
      interaction
        .awaitModalSubmit({ filter, time: 30_000 })
        .then((modalInteraction) => {
          const testValue =
            modalInteraction.fields.getTextInputValue("testInput");
          const testerValue =
            modalInteraction.fields.getTextInputValue("testerInput");
          reply.edit({
            content: `testing the test...:  ${testValue}, ${testerValue}`,
            components: [],
          });
        })
        .catch((err) => {
          console.log(err);
        });
    }

    if (!interaction) {
      if (autoroom) {
        await interaction.editReply(
          `AutoRooms have already been setup autorooms will be created in ${autoroom.category} to disable run **/autoroom disable**`
        );
        return;
      }

      const createdCategory = await interaction.guild.channels.create({
        name: "AutoRooms",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });
    }
  },
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};
