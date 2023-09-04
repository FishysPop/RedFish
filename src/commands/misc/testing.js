const {Client,Interaction,SlashCommandBuilder,PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, ChannelSelectMenuBuilder } = require('discord.js');
//
module.exports = {
      /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  data: new SlashCommandBuilder()
  .setName('test')
  .setDescription('for testing commands'),
 

  run: async ({ interaction, client, handler }) => {
  
    const openModalButton =  new ButtonBuilder()
    .setLabel('Open Test')
    .setStyle(ButtonStyle.Primary)
    .setCustomId('openModalButton')
    
    const closeButton = new ButtonBuilder()
    .setLabel('Close')
    .setStyle(ButtonStyle.Danger)
    .setCustomId('Close')

    const choiceButton = new ButtonBuilder()
    .setLabel('Choice')
    .setStyle(ButtonStyle.Secondary)
    .setCustomId('Choice')
     
    const row = new ActionRowBuilder().addComponents(openModalButton, closeButton, choiceButton)
    const reply = await interaction.reply({ content: "Test", components: [row] })
    const filter1 = (i) => i.user.id === interaction.user.id;
    const collector = reply.createMessageComponentCollector({
      ComponentType: ComponentType.Button,
      filter: filter1,
      time: 30_000,
    });
    collector.on('collect', async (interaction) => {
    if (interaction.customId === 'openModalButton') {
      const modal = new ModalBuilder({
        custom_id: `testModal-${interaction.user.id}`,
        title: "Test", 
      });
      const testInput = new TextInputBuilder({
        custom_id: "testInput",
        label: "test?",
        style: TextInputStyle.Short
      });
      const testerInput = new TextInputBuilder({
        custom_id: "testerInput",
        label: "Do You Like Tests?",
        style: TextInputStyle.Paragraph
      });
      const firstRow = new ActionRowBuilder().addComponents(testInput);
      const secondRow = new ActionRowBuilder().addComponents(testerInput);
      modal.addComponents(firstRow, secondRow)
      await interaction.showModal(modal)
      
      const filter = (interaction) => interaction.customId === `testModal-${interaction.user.id}`
      interaction.awaitModalSubmit({ filter, time: 30_000})
      .then((modalInteraction) => {
       const testValue = modalInteraction.fields.getTextInputValue('testInput')
       const testerValue = modalInteraction.fields.getTextInputValue('testerInput')
       modalInteraction.deferUpdate();
       interaction.editReply({
        content: `testing the test...:  ${testValue}, ${testerValue}`,
        components: [],
      })
      }).catch((err) => {
        console.log(err)
      })
    }

    if (interaction.customId === 'Choice') {
      const channelSelect = new ChannelSelectMenuBuilder()
			.setCustomId('channels')
			.setPlaceholder('Select a channel.')
			.setMaxValues(1);

		const row1 = new ActionRowBuilder()
			.addComponents(channelSelect);
      
     await reply.edit({
        content: 'Select the channel you are in right now:',
        components: [row1],
      });
      const collector = reply.createMessageComponentCollector({
        ComponentType: ComponentType.ChannelSelect,
        filter: filter1,
        time: 30_000,
      });
      collector.on('collect', async (interaction) => {
       const value = interaction.values[0]
      if (value === interaction.channel.id) {
        reply.edit({
          content: 'Well done you picked the right channel',
          components: [],
        });
      } else {
        reply.edit({
          content: "Oh no... You picked the wrong channel",
          components: [],
        });

      }

      })
 




     }
     if (interaction.customId === 'Close') {
      try {
        await reply.delete();
    } catch (error) {
        console.error("Error deleting message:", error);
      }
    await collector.stop();

    return;
    }
    
    })
    collector.on('end', async (collectedInteractions) => {
      try {
        if (!reply.deleted) {
          await interaction.editReply({ components: [] });
        }
      } catch (error) {
      }
    });

  },
  // devOnly: Boolean,
  //testOnly: true,
  // options: Object[],
  // deleted: Boolean,
};
