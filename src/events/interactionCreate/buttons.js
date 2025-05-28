const {Client,Interaction,PermissionsBitField,ChannelType,EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle, MessageFlags} = require("discord.js");
const { useQueue } = require("discord-player");
const Ticket = require("../../models/Ticket");
const Giveaway = require("../../models/Giveaway");

module.exports = async (interaction, client, handler) => {
  if (interaction.isButton()) {
    const buttonname = interaction.customId;
    const user = interaction.user.username;
    const usera = interaction.user;
    const discriminator = interaction.user.discriminator;
    const queue = useQueue(interaction.guildId);
    let player;
    if (client.playerType === 'lavalink' || client.playerType === 'both') { 
      player = client.manager.players.get(interaction.guildId);
     }
    try {
      switch (buttonname) {
        case "LavaPause":
          try {
            let playing = player.paused
            if (!playing) {
              const LavaPlayerPauseEmbed = await new EmbedBuilder()
                .setColor("#e66229")
                .setDescription(`${usera} has paused the queue.`);
              interaction.reply({ embeds: [LavaPlayerPauseEmbed] });
              player.pause(true);
            } else {
              const LavaPlayerResumedEmbed = await new EmbedBuilder()
                .setColor("#e66229")
                .setDescription(`${usera} has resumed the queue.`);
              interaction.reply({ embeds: [LavaPlayerResumedEmbed] });
              player.pause(false);
            }
          } catch {
            interaction.reply({
              content: `The bot is not in a voice channel`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "LavaSkip":
          if (!player) {
            interaction.reply({
              content: `There is no music playing`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            player.skip();
            const LavaPlayerSkipEmbed = await new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`${usera} has skipped a song.`);
            interaction.reply({ embeds: [LavaPlayerSkipEmbed] });
          }

          break;
        case "LavaStop":
          try {
            if (!player ) return interaction.reply({content: `The bot is not in a voice channel`, flags: MessageFlags.Ephemeral });
            player.destroy().catch(e => null);
            const LavaPlayerStopEmbed = await new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`${usera} has disconnected the bot.`);
            interaction.reply({ embeds: [LavaPlayerStopEmbed] });
          } catch {
            interaction.reply({
              content: `The bot is not in a voice channel`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "LavaLoop":
          try {
            if (player.loop === "queue") {
              const LavaPlayerLoopEmbed2 = await new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`${usera} has unlooped the queue.`);
            interaction.reply({ embeds: [LavaPlayerLoopEmbed2] });
            player.setLoop("none")
            } else {
              const LavaPlayerLoopEmbed = await new EmbedBuilder()
                .setColor("#e66229")
                .setDescription(`${usera} has looped the queue.`);
              interaction.reply({ embeds: [LavaPlayerLoopEmbed] });
              player.setLoop("queue")

            }
          } catch {
            interaction.reply({
              content: `There is no music playing`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "LavaShuffle":
          try {
            player.queue.shuffle();
            const PlayerShuffleEmbed = await new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`${usera} has shuffled the queue.`);
            interaction.reply({ embeds: [PlayerShuffleEmbed] });
          } catch {
            interaction.reply({
              content: `There is no music playing`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "Pause":
          try {
            let playing = !queue.node.isPaused();
            if (playing) {
              const PlayerPauseEmbed = await new EmbedBuilder()
                .setColor("#e66229")
                .setDescription(`${usera} has paused the queue.`);
              interaction.reply({ embeds: [PlayerPauseEmbed] });
              queue.node.pause();
            } else {
              const PlayerResumedEmbed = await new EmbedBuilder()
                .setColor("#e66229")
                .setDescription(`${usera} has resumed the queue.`);
              interaction.reply({ embeds: [PlayerResumedEmbed] });
              queue.node.resume();
            }
          } catch {
            interaction.reply({
              content: `There is no music playing`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "Skip":
          if (!queue || !queue.isPlaying()) {
            interaction.reply({
              content: `There is no music playing`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            queue.node.skip();
            const PlayerSkipEmbed = await new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`${usera} has skipped a song.`);
            interaction.reply({ embeds: [PlayerSkipEmbed] });
          }

          break;

        case "Stop":
          try {
            queue.delete();
            const PlayerStopEmbed = await new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`${usera} has disconnected the bot.`);
            interaction.reply({ embeds: [PlayerStopEmbed] });
          } catch {
            interaction.reply({
              content: `The bot is not in a voice channel`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "Loop":
          try {
            let repeatMode = queue.repeatMode;
            if (repeatMode === 0) {
              const PlayerLoopEmbed = await new EmbedBuilder()
                .setColor("#e66229")
                .setDescription(`${usera} has looped the queue.`);
              interaction.reply({ embeds: [PlayerLoopEmbed] });
              queue.setRepeatMode(2);
            } else {
              const PlayerLoopEmbed2 = await new EmbedBuilder()
                .setColor("#e66229")
                .setDescription(`${usera} has unlooped the queue.`);
              interaction.reply({ embeds: [PlayerLoopEmbed2] });
              queue.setRepeatMode(0);
            }
          } catch {
            interaction.reply({
              content: `There is no music playing`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "Shuffle":
          try {
            queue.tracks.shuffle();
            const PlayerShuffleEmbed = await new EmbedBuilder()
              .setColor("#e66229")
              .setDescription(`${usera} has shuffled the queue.`);
            interaction.reply({ embeds: [PlayerShuffleEmbed] });
          } catch {
            interaction.reply({
              content: `There is no music playing`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "Ticket":
          const ticket = await Ticket.findOne({
            guildId: interaction.guild.id,
          });
          if (
            !interaction.guild.members.me.permissions.has(
              PermissionsBitField.Flags.ManageChannels
            )
          )
            return await interaction.reply({
              content: "I do not have manageChannels permission",
              flags: MessageFlags.Ephemeral,
            });
          if (!ticket) {
            interaction.reply({
              content: `Tickets have been disabled on this server **/ticket setup** or **/ticket quicksetup** to re-enable it`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          try {
            ticketChannel = await interaction.guild.channels.create({
              name: `ticket-${ticket.ticketNumber}`,
              type: ChannelType.GuildText,
              parent: `${ticket.category}`,
              permissionOverwrites: [
                {
                  id: interaction.guild.id,
                  deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                  id: interaction.user.id,
                  allow: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                  id: client.user.id,
                  allow: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                  id: ticket.role,
                  allow: [PermissionsBitField.Flags.ViewChannel],
                },
              ],
            });
            await interaction.reply({
              content: `Ticket Created ${ticketChannel}`,
              flags: MessageFlags.Ephemeral,
            });
            ticket.ticketNumber = ticket.ticketNumber + 1;
            await ticket.save();

            const ticketEmbed = await new EmbedBuilder()
              .setColor("#e66229")
              .setTitle(
                `${interaction.user.username}#${interaction.user.discriminator}'s ticket`
              );
            const Delete = new ButtonBuilder()
              .setCustomId("delete")
              .setLabel("Delete")
              .setStyle(ButtonStyle.Danger);
            const Archive = new ButtonBuilder()
              .setCustomId("archive")
              .setLabel("Archive")
              .setStyle(ButtonStyle.Success);
            const row = new ActionRowBuilder().addComponents(Delete, Archive);
            setTimeout(delay, 1000);
            function delay() {
              ticketChannel.send({ embeds: [ticketEmbed], components: [row] });
            }
          } catch (error) {
            console.log(error);
            interaction.reply({
              content: `The ticket category or Ticket staff role was deleted \nPlease run **/ticket disable** then **/ticket quicksetup** or **/ticket setup**`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "delete":
          if (
            !interaction.guild.members.me.permissions.has(
              PermissionsBitField.Flags.ManageChannels
            )
          )
            return await interaction.reply({
              content: "I do not have manageChannels permission",
              flags: MessageFlags.Ephemeral,
            });
          try {
            const channelTarget = interaction.channel;
            channelTarget.delete();
          } catch (error) {
            interaction.reply({
              content: `Error while deleting ${error}`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "archive":
          let role = interaction.guild.roles;
          const ticket2 = await Ticket.findOne({
            guildId: interaction.guild.id,
          });
          if (
            !interaction.guild.members.me.permissions.has(
              PermissionsBitField.Flags.ManageChannels
            )
          )
            return await interaction.reply({
              content: "I do not have manageChannels permission",
              flags: MessageFlags.Ephemeral,
            });

          try {
            const channelTarget = interaction.channel;
            if (
              interaction.guild.roles.cache.some(
                (role) => role.id === ticket2.role
              )
            ) {
              channelTarget.permissionOverwrites.set([
                {
                  id: interaction.guild.id,
                  deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                  id: ticket2.role,
                  allow: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                  id: client.user.id,
                  allow: [PermissionsBitField.Flags.ViewChannel],
                },
              ]);
              interaction.channel.setName(
                `${interaction.channel.name} Archived`
              );
              interaction.reply("**Ticket Archived**");
            } else {
              interaction.reply({
                content: `The Ticket staff role was deleted \nPlease run **/ticket disable** then **/ticket quicksetup** or **/ticket setup**`,
                flags: MessageFlags.Ephemeral,
              });
            }
          } catch (error) {
            console.log(error);
            interaction.reply({
              content: `The ticket category or Ticket staff role was deleted \nPlease run **/ticket disable** then **/ticket quicksetup** or **/ticket setup**`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        case "giveawayEnter":
          const giveaway = await Giveaway.findOne({
            messageId: interaction.message.id,
          });
          if (!giveaway) {
            interaction.reply({
              content: `This giveaway has ended or doesnt exist create a new one with **/giveaway create**`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          if (giveaway.requiredRole !== "null") {
            const roleRequired = giveaway.requiredRole;
            if (!interaction.member.roles.cache.has(roleRequired)) {
              interaction.reply({
                content: `You do not have the required role to enter this giveaway`,
                flags: MessageFlags.Ephemeral,
              });
              return;
            }
          }
          const existingEntry = giveaway.entriesArray.includes(
            interaction.user.id
          );
          if (existingEntry) {
            interaction.reply({
              content: "You have left the giveaway",
              flags: MessageFlags.Ephemeral,
            });
            await Giveaway.updateOne(
              { _id: giveaway._id },
              { $pull: { entriesArray: interaction.user.id } }
            ).catch((error) => {
              console.error(
                "Error occurred while removing entry from giveaway:",
                error
              );
            });
          } else {
            interaction.reply({
              content: "You have entered the giveaway",
              flags: MessageFlags.Ephemeral,
            });
            giveaway.entriesArray.push(interaction.user.id);
            await giveaway.save().catch((error) => {
              console.log("error while saving giveaway entries:", error);
            });
          }
          const updatedGiveaway = await Giveaway.findById(giveaway._id);
          const date = new Date(updatedGiveaway.giveawayEnd);
          const unixTimestamp = Math.floor(date.getTime() / 1000);
          const timestamp = `<t:${unixTimestamp}:R>`;
          const discordIdCount = updatedGiveaway.entriesArray.length;
          const giveawayEmbed = new EmbedBuilder()
            .setColor("#e66229")
            .setTitle(updatedGiveaway.messageTitle)
            .setDescription(
              `Winners: ${updatedGiveaway.winners}\nEntries: ${discordIdCount}\n Ends In: ${timestamp}`
            )
            .setFooter({ text: `Click The Button Below To Enter` });
          const giveawayEnterButton = new ButtonBuilder()
            .setCustomId("giveawayEnter")
            .setEmoji("🎉")
            .setStyle(ButtonStyle.Success);
          const row = new ActionRowBuilder().addComponents(giveawayEnterButton);
          const message = await interaction.channel.messages.fetch(
            updatedGiveaway.messageId
          );
          message
            .edit({
              embeds: [giveawayEmbed],
              components: [row],
            })
            .catch((err) => {
              console.log(
                "error while sending message for giveaway enter:",
                err
              );
            });
        default:
          break;
      }
    } catch (error) {
      console.log("error with buttons", error);
    }
  }
};
