const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

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
      if (interaction.user.id !== process.env.OWNER_ID) return interaction.reply({ content: "Only Developers Can Run This Command", flags: MessageFlags.Ephemeral });
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const prettyMs = await getPrettyMs();
      const getNodes = () => Array.from(client.manager.nodeManager.nodes.values());
      let nodes = getNodes();
      let currentNode = 0; 

      const checkRateLimit = async (targetNode) => {
        if (!targetNode) return 'N/A';
        const ratelimitCheck = await targetNode.search({ query: "https://www.youtube.com/watch?v=C0DPdy98e4c", source: "ytsearch" }, interaction.user).catch(() => null);
        return ratelimitCheck?.tracks?.length ? 'Rate Limited: False' : 'Rate Limited: True';
      };

      const createEmbed = async (index) => {
        nodes = getNodes();
        if (index >= nodes.length) index = 0;
        const targetNode = nodes[index];
        const rateLimited = await checkRateLimit(targetNode);

        const embed = new EmbedBuilder()
          .setTitle("Node Manager")
          .setDescription(`\`\`\`
Name: ${targetNode?.id || 'Unknown'}
Host: ${targetNode?.options?.host || 'Unknown'}:${targetNode?.options?.port || ''}
Players: ${targetNode?.stats?.players || '0'}
Playing: ${targetNode?.stats?.playingPlayers || '0'}
Uptime: ${targetNode?.stats?.uptime ? prettyMs(targetNode.stats.uptime, { compact: true }) : 'N/A'}
Memory: ${targetNode?.stats?.memory ? (targetNode.stats.memory.used / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}
CPU: ${targetNode?.stats?.cpu?.systemLoad ? (targetNode.stats.cpu.systemLoad * 100).toFixed(2) + '%' : 'N/A'}
Status: ${targetNode?.connected ? 'Connected' : 'Disconnected'}
${rateLimited}
\`\`\``) 
          .setColor("#e66229")
          .setFooter({text: `Shard: ${interaction.guild?.shardId ? interaction.guild?.shardId : '0'} | Cluster: ${client.cluster?.id || 0}`});

        nodes.forEach((node, idx) => {
          embed.addFields({
            name: `${idx === index ? '`' : ''}${node.id}${idx === index ? '`' : ''}`,
            value: `${idx === index ? '`' : ''}State: ${node.connected ? 'Connected' : 'Disconnected'}\nPlayers: ${node.stats?.playingPlayers || 0}/${node.stats?.players || 0}${idx === index ? '`' : ''}`,
            inline: true
          });
        });

        return embed;
      };

      const createComponents = (index) => {
        nodes = getNodes();
        const row = new ActionRowBuilder();
        const reconnectButton = new ButtonBuilder().setCustomId('reconnectButton').setLabel("Reconnect").setEmoji("<:restart:1278452014807912539>").setStyle(ButtonStyle.Primary);
        const disconnectButton = new ButtonBuilder().setCustomId('disconnectButton').setLabel("Disconnect").setEmoji("<:power:1278452025696325642>").setStyle(ButtonStyle.Danger);
        const removeButton = new ButtonBuilder().setCustomId('removeButton').setLabel("Remove").setEmoji('<:remove:1278452000375181362>').setStyle(ButtonStyle.Danger);
        const addButton = new ButtonBuilder().setCustomId('addButton').setLabel("Add").setEmoji("<:add:1278451980452499476>").setStyle(ButtonStyle.Success);
        row.addComponents(reconnectButton, disconnectButton, removeButton, addButton);

        const row2 = new ActionRowBuilder();
        const nodeSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('nodeSelectMenu')
          .setPlaceholder('Select a node');

        nodes.forEach((node, idx) => {
          nodeSelectMenu.addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel(node.id || node.name || `Node ${idx + 1}`)
              .setValue(idx.toString())
          );
        });
        row2.addComponents(nodeSelectMenu);
        return [row, row2];
      };

      const embed = await createEmbed(currentNode);
      const components = createComponents(currentNode);
      const message = await interaction.editReply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });

      const collector = message.createMessageComponentCollector({
        idle: 400000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: "This is not your settings", flags: MessageFlags.Ephemeral });
        nodes = getNodes();

        switch (i.customId) {
          case "nodeSelectMenu":
            i.deferUpdate();
            currentNode = parseInt(i.values[0], 10);
            const updatedEmbed = await createEmbed(currentNode);
            await interaction.editReply({ embeds: [updatedEmbed], components: createComponents(currentNode), flags: MessageFlags.Ephemeral });
            break;
          case "disconnectButton":
            i.deferUpdate();
            const nodeToDisconnect = nodes[currentNode];
            if (nodeToDisconnect) {
              const targetNode = nodes.find(n => n.id !== nodeToDisconnect.id && n.connected);
              const playersToMove = Array.from(client.manager.players.values()).filter(p => p.node?.id === nodeToDisconnect.id);
              
              if (playersToMove.length > 0 && targetNode) {
                for (const player of playersToMove) {
                  await player.changeNode(targetNode.id).catch(err => console.error("Error migrating player node:", err));
                }
              }

              try {
                nodeToDisconnect.destroy("disconnect");
              } catch (dErr) {}
              await interaction.followUp({ content: `Node **${nodeToDisconnect.id}** disconnected.${playersToMove.length > 0 && targetNode ? ` Moved ${playersToMove.length} players to ${targetNode.id}.` : ''}`, flags: MessageFlags.Ephemeral });
              const freshEmbed = await createEmbed(currentNode);
              await interaction.editReply({ embeds: [freshEmbed], components: createComponents(currentNode), flags: MessageFlags.Ephemeral });
            }
            break;
          case "removeButton":
            i.deferUpdate();
            const nodeToRemove = nodes[currentNode];
            if (nodeToRemove) {
              const targetNode = nodes.find(n => n.id !== nodeToRemove.id && n.connected);
              const playersToMove = Array.from(client.manager.players.values()).filter(p => p.node?.id === nodeToRemove.id);
              
              if (playersToMove.length > 0 && targetNode) {
                for (const player of playersToMove) {
                  await player.changeNode(targetNode.id).catch(err => console.error("Error migrating player node:", err));
                }
              }

              try {
                client.manager.nodeManager.deleteNode(nodeToRemove.id);
              } catch (delErr) {}
              await interaction.followUp({ content: `Node **${nodeToRemove.id}** removed.${playersToMove.length > 0 && targetNode ? ` Moved ${playersToMove.length} players to ${targetNode.id}.` : ''}`, flags: MessageFlags.Ephemeral });
              currentNode = 0;
              const freshEmbed = await createEmbed(currentNode);
              await interaction.editReply({ embeds: [freshEmbed], components: createComponents(currentNode), flags: MessageFlags.Ephemeral });
            }
            break;
          case "reconnectButton":
            i.deferUpdate();
            const nodeToReconnect = nodes[currentNode];
            if (nodeToReconnect) {
              try {
                await nodeToReconnect.connect();
              } catch (cErr) {}
              await interaction.followUp({ content: `Reconnecting node **${nodeToReconnect.id}**...`, flags: MessageFlags.Ephemeral });
              const freshEmbed = await createEmbed(currentNode);
              await interaction.editReply({ embeds: [freshEmbed], components: createComponents(currentNode), flags: MessageFlags.Ephemeral });
            }
            break;
          case "addButton":
            const modal = new ModalBuilder()
              .setCustomId('addNodeModal')
              .setTitle('Add New Node');

            const nameInput = new TextInputBuilder()
              .setCustomId('nodeName')
              .setLabel("Node Name / ID")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Enter node ID')
              .setRequired(true);

            const urlInput = new TextInputBuilder()
              .setCustomId('nodeUrl')
              .setLabel("Node Host") 
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g., 127.0.0.1') 
              .setRequired(true);

            const portInput = new TextInputBuilder()
              .setCustomId('nodePort')
              .setLabel("Node Port")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g., 2333')
              .setRequired(true);

            const authInput = new TextInputBuilder()
              .setCustomId('nodeAuth')
              .setLabel("Node Password")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Enter node password')
              .setRequired(true);

            modal.addComponents(
              new ActionRowBuilder().addComponents(nameInput),
              new ActionRowBuilder().addComponents(urlInput),
              new ActionRowBuilder().addComponents(portInput),
              new ActionRowBuilder().addComponents(authInput)
            );
            await i.showModal(modal);  

            const modalFilter = (modalInt) => modalInt.isModalSubmit() && modalInt.customId === 'addNodeModal' && modalInt.user.id === i.user.id;

            interaction.awaitModalSubmit({ filter: modalFilter, time: 60000 }) 
              .then(async (modalInteraction) => {
                const nodeName = modalInteraction.fields.getTextInputValue('nodeName');
                const nodeHost = modalInteraction.fields.getTextInputValue('nodeUrl');
                const nodePort = parseInt(modalInteraction.fields.getTextInputValue('nodePort'), 10);
                const nodeAuth = modalInteraction.fields.getTextInputValue('nodeAuth');

                try {
                  await client.manager.nodeManager.createNode({
                    id: nodeName,
                    host: nodeHost,
                    port: nodePort,
                    authorization: nodeAuth,
                    secure: false
                  });
                  await modalInteraction.reply({ content: `Node ${nodeName} added.`, flags: MessageFlags.Ephemeral });

                  const updatedEmbed = await createEmbed(currentNode);
                  await interaction.editReply({ embeds: [updatedEmbed], components: createComponents(currentNode), flags: MessageFlags.Ephemeral });

                } catch (error) {
                  console.error("Failed to add node:", error);
                  await modalInteraction.reply({ content: `Failed to add node: ${error.message}`, flags: MessageFlags.Ephemeral });
                }
              })
              .catch(async (error) => {
                console.error("Modal submit error:", error);
              });
            break;
        }
      });

      collector.on("end", () => {
        interaction.editReply({
          components: [],
        }).catch(() => {});
      });

    } catch (error) {
      console.log("error while running node-manager:", error);
      if (interaction.deferred || interaction.replied) {
        interaction.editReply({ content: `Oops seems we ran into an error: ${error.message}` }).catch(() => {});
      } else {
        interaction.reply({ content: `Oops seems we ran into an error: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
