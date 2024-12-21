const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, } = require('discord.js');
async function getPrettyMs() {
  const { default: prettyMilliseconds } = await import('pretty-ms');
  return prettyMilliseconds;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('node-manger')
    .setDescription('Developer only, manage lavalink nodes.'),

  run: async ({ interaction, client, handler }) => {
    try {
      if (interaction.user.id !== process.env.OWNER_ID) return interaction.reply({ content: "Only Developers Can Run This Command", ephemeral: true });
      await interaction.deferReply({ ephemeral: true });

      const prettyMs = await getPrettyMs();
      const kazagumo = client.manager;
      const shoukaku = client.manager.shoukaku;
      const nodes = client.manager.shoukaku.nodes;
      const nodesArray = Array.from(nodes);
      let currentNode = 0; 

      // Function to check rate limit for a specific node
      const checkRateLimit = async (nodeName) => {
        const ratelimitCheck = await client.manager.search("https://www.youtube.com/watch?v=C0DPdy98e4c", { engine: 'youtube', nodeName: nodeName });
        return ratelimitCheck.tracks?.length ? 'Rate Limited: False' : 'Rate Limited: True';
      };

      const StatusCodes = {
        0: "Connecting",
        1: "Nearly Connected",
        2: "Connected",
        3: "Reconnecting",
        4: "Disconnecting",
        5: "Disconnected",
      };

      // Function to create the embed dynamically
      const createEmbed = async (currentNode) => {
        const rateLimited = await checkRateLimit(nodesArray[currentNode][1].name); // Check rate limit for the current node

        const embed = new EmbedBuilder()
          .setTitle("Node Manager")
          .setDescription(`\`\`\`
Name: ${nodesArray[currentNode][1].name}
Url: ${nodesArray[currentNode][1].url.replace('ws://', '')}
Players: ${nodesArray[currentNode][1].stats?.players ? nodesArray[currentNode][1].stats.players : '0'}
Playing: ${nodesArray[currentNode][1].stats?.playingPlayers ? nodesArray[currentNode][1].stats.playingPlayers : '0'}
Uptime: ${nodesArray[currentNode][1].stats?.uptime ? prettyMs(nodesArray[currentNode][1].stats?.uptime, { compact: true }) : 'N/A'}
Memory: ${nodesArray[currentNode][1].stats?.memory ? (nodesArray[currentNode][1].stats.memory.used / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}
CPU: ${nodesArray[currentNode][1].stats?.cpu.systemLoad ? (nodesArray[currentNode][1].stats.cpu.systemLoad * 100).toFixed(2) + '%' : 'N/A'}
Status: ${StatusCodes[nodesArray[currentNode][1].state]}
${rateLimited}
\`\`\``) 
          .setColor("#e66229")
          .setFooter({ text: "test" });

        nodesArray.forEach((node, index) => {
          embed.addFields({
            name: `${index === currentNode ? '`' : ''}${node[1].name}${index === currentNode ? '`' : ''}`, // Bold the selected node's name
            value: `${index === currentNode ? '`' : ''}State: ${StatusCodes[node[1].state]}\nPlayers: ${node[1]?.stats?.playingPlayers || 0}/${node[1]?.stats?.players || 0}${index === currentNode ? '`' : ''}`,
            inline: true
          });
        });

        return embed;
      };

      const embed = await createEmbed(currentNode); // Create the initial embed

      const row = new ActionRowBuilder()
      const reconnectButton = new ButtonBuilder().setCustomId('reconnectButton').setLabel("Reconnect").setEmoji("<:restart:1278452014807912539>").setStyle(ButtonStyle.Primary);
      const disconnectButton = new ButtonBuilder().setCustomId('disconnectButton').setLabel("Disconnect").setEmoji("<:power:1278452025696325642>").setStyle(ButtonStyle.Danger);
      const removeButton = new ButtonBuilder().setCustomId('removeButton').setLabel("Remove").setEmoji('<:remove:1278452000375181362>').setStyle(ButtonStyle.Danger);
      const addButton = new ButtonBuilder().setCustomId('addButton').setLabel("Add").setEmoji("<:add:1278451980452499476>").setStyle(ButtonStyle.Success);
      row.addComponents(reconnectButton, disconnectButton, removeButton, addButton);

      const row2 = new ActionRowBuilder()
      const nodeSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('nodeSelectMenu')
        .setPlaceholder('Select a node');

      nodesArray.forEach((node, index) => {
        nodeSelectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(node[1].name)
            .setValue(index.toString()) // Use index as value
        );
      });
      row2.addComponents(nodeSelectMenu)

      const message = await interaction.editReply({ embeds: [embed], components: [row, row2], ephemeral: true });

      const collector = message.createMessageComponentCollector({
        idle: 400000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: "This is not your settings", ephemeral: true });

        switch (i.customId) {
          case "nodeSelectMenu":
            i.deferUpdate();
            currentNode = parseInt(i.values[0]); // Get the selected node index
            const updatedEmbed = await createEmbed(currentNode); // Create a new embed with the updated currentNode
            await interaction.editReply({ embeds: [updatedEmbed], components: [row, row2], ephemeral: true });
          break;
          case "disconnectButton":
            i.deferUpdate();
            const nodeToDisconnect = nodesArray[currentNode][1];
            await nodeToDisconnect.ws.close();
            await interaction.followUp({ content: `Node ${nodeToDisconnect.name} disconnected.`, ephemeral: true });
          break;
          case "removeButton":
            i.deferUpdate();
            const nodeToRemove = nodesArray[currentNode][1];
          
            try {
              client.manager.players.forEach(async (player) => {
                if (player.node.name === nodeToRemove.name) {
                  await player.destroy();
                }
              });          
              if (nodeToRemove.state == 2) {
                console.log(nodeToRemove.destroyed)
                nodeToRemove.disconnect(5, 'Node removed');
                await nodeToRemove.ws.close();
                nodeToRemove.on('close', async () => {
                  client.manager.shoukaku.removeNode(nodeToRemove.name);
                  await interaction.followUp({ content: `Node ${nodeToRemove.name} removed.`, ephemeral: true });
                });
              } else {
                console.log("test")
                client.manager.shoukaku.removeNode(nodeToRemove.name);
                await interaction.followUp({ content: `Node ${nodeToRemove.name} removed.`, ephemeral: true });
              }
            } catch (removeError) {
              console.error("Error removing node:", removeError);
              if (removeError.message.includes('This node does not exist.')) {
                await interaction.followUp({ content: `Node ${nodeToRemove.name} does not exist or is already removed.`, ephemeral: true });
              } else if (removeError.message.includes('Could not disconnect node')) {
                await interaction.followUp({ content: `Failed to remove node ${nodeToRemove.name}. It may be busy or in a bad state. Please try again later.`, ephemeral: true });
              } else {
                await interaction.followUp({ content: `Failed to remove node ${nodeToRemove.name}: ${removeError.message}`, ephemeral: true });
              }
              
              const updatedNodesArray = Array.from(client.manager.shoukaku.nodes);
              const updatedEmbed = await createEmbed(0); 
              await interaction.editReply({ embeds: [updatedEmbed], components: [row, row2], ephemeral: true });
            }
            break;
          case "reconnectButton":
              i.deferUpdate();
              const nodeToReconnect = nodesArray[currentNode][1];
              console.log(nodeToReconnect.url)
              let nodeUrl = nodeToReconnect.url.replace('ws://', '').replace('/v4/websocket', '');
              if (!nodeToReconnect.connected) {
                client.manager.shoukaku.addNode({
                  name: nodeToReconnect.name,
                  url: nodeUrl,
                  auth: nodeToReconnect.auth,
                  secure: nodeToReconnect.secure
                 });
                await interaction.followUp({ content: `Node ${nodeToReconnect.name} reconnected.`, ephemeral: true });
              } else {
                await interaction.followUp({ content: `Node ${nodeToReconnect.name} is already connected.`, ephemeral: true });
              }
          break;
          case "addButton":
            const modal = new ModalBuilder()
            .setCustomId('addNodeModal')
            .setTitle('Add New Node');

           const nameInput = new TextInputBuilder()
            .setCustomId('nodeName')
            .setLabel("Node Name")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter node name')
            .setRequired(true);

           const urlInput = new TextInputBuilder()
            .setCustomId('nodeUrl')
            .setLabel("Node URL (host:port)") 
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 127.0.0.1:2333') 
            .setRequired(true);

           const authInput = new TextInputBuilder()
            .setCustomId('nodeAuth')
            .setLabel("Node Password")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter node password')
            .setRequired(true);


          const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
          const secondActionRow = new ActionRowBuilder().addComponents(urlInput);
          const thirdActionRow = new ActionRowBuilder().addComponents(authInput);


          modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
          await i.showModal(modal);  

            const modalFilter = (interaction) => interaction.isModalSubmit() && interaction.customId === 'addNodeModal' && interaction.user.id === i.user.id; // Important user check

            interaction.awaitModalSubmit({ filter: modalFilter, time: 60000 }) 
                .then(async (modalInteraction) => {
                    const nodeName = modalInteraction.fields.getTextInputValue('nodeName');
                    const nodeUrl = modalInteraction.fields.getTextInputValue('nodeUrl');
                    const nodeAuth = modalInteraction.fields.getTextInputValue('nodeAuth');

                    try {
                        const newNode = {
                            name: nodeName,
                            url: nodeUrl,  
                            auth: nodeAuth,
                            secure: false
                        };
                        client.manager.shoukaku.addNode(newNode);
                        await modalInteraction.reply({ content: `Node ${nodeName} added.`, ephemeral: true });

                        const updatedEmbed = await createEmbed(currentNode);
                        await interaction.editReply({ embeds: [updatedEmbed], components: [row, row2], ephemeral: true });

                    } catch (error) {
                        console.error("Failed to add node:", error);
                        await modalInteraction.reply({ content: `Failed to add node: ${error.message}`, ephemeral: true });
                    }
                })
                .catch(async(error) => {
                    console.error("Modal submit error:", error)
                    await interaction.followUp({content: `Modal timed out or there was an error.  Node not added.`, ephemeral: true}) // Handle timeout or other errors
                });
              break;
        }
      });

      collector.on("end", () => {
        interaction.editReply({
          components: [],
        });
      });

    } catch (error) {
      console.log("error while running node-manager:", error)
      interaction.editReply(`Oops seems we ran into an error: ${error}`,)
    }
  },
  // devOnly: Boolean,
  //testOnly: true,
  //deleted: true,
};
