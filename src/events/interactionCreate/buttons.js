const { Client, Interaction , PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const { useQueue } = require('discord-player');
const Ticket = require("../../models/Ticket");

module.exports = async (interaction, client ,handler) => {
    const queue = useQueue(interaction.guildId)
    if(interaction.isButton()) {
       const buttonname = interaction.customId
       const user = interaction.user.username
       const usera = interaction.user
       const discriminator = interaction.user.discriminator
        if(buttonname ==='Pause') { try {
            let playing = !queue.node.isPaused();
            if (playing) {
                interaction.reply(`${user}#${discriminator} has paused the queue.`)
                queue.node.pause()
                
            } else {
                interaction.reply(`${user}#${discriminator} has resumed the queue.`)
                queue.node.resume();
            } } catch {
                interaction.reply({content: `There is no music playing`,ephemeral: true,})
                ;}
         return;
        }
        if(buttonname ==='Skip') {
            if (!queue || !queue.isPlaying()) {
                interaction.reply({content: `There is no music playing`,ephemeral: true,})
               } else {
                queue.node.skip()
                interaction.reply(`${user}#${discriminator} has skipped a song.`)
               }
            return;
        }
        if(buttonname ==='Stop') {
            try {
                queue.delete();
                interaction.reply(`${user}#${discriminator} has disconnected the bot.`)

               } catch {
                interaction.reply({content: `The bot is not in a voice channel`,ephemeral: true,})
           ;}
            return;
        }
        if(buttonname ==='Loop') {
            try {
                let repeatMode = queue.repeatMode;
                if (repeatMode === 0) {
                    interaction.reply(`${user}#${discriminator} has looped the queue.`)
                    queue.setRepeatMode(2);
                    
            } else {
                   interaction.reply(`${user}#${discriminator} has unlooped the queue.`)
                    queue.setRepeatMode(0);
                } } catch {
                    interaction.reply({content: `There is no music playing`,ephemeral: true,})
                }
             return;
        }
        if(buttonname ==='Shuffle') {
            try {
                queue.tracks.shuffle();
                interaction.reply(`${user}#${discriminator} has shuffled the queue.`)
               } catch {
                interaction.reply({content: `There is no music playing`,ephemeral: true,})
               }
            return;
        }
        if(buttonname ==='Ticket') {
            const ticket = await Ticket.findOne({ guildId: interaction.guild.id });
            if(!(interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels))) return await interaction.reply({content: 'I do not have manageChannels permission', ephemeral: true})
            if (!ticket) {
                interaction.reply({content: `Tickets have been disabled on this server **/ticket setup** or **/ticket quicksetup** to re-enable it`,ephemeral: true,})
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
                            id: ticket.role,
                            allow: [PermissionsBitField.Flags.ViewChannel],
                        },
                    ],
                });
                await interaction.reply({content: `Ticket Created ${ticketChannel}`,ephemeral: true,})
                 ticket.ticketNumber = ticket.ticketNumber + 1;
                 ticket.save();

                 const ticketEmbed = await new EmbedBuilder()
                 .setColor("#e66229")
                 .setTitle(`${interaction.user.username}#${interaction.user.discriminator}'s ticket`)
                 const Delete = new ButtonBuilder().setCustomId('delete').setLabel('Delete').setStyle(ButtonStyle.Danger);
                 const Archive = new ButtonBuilder().setCustomId('archive').setLabel('Archive').setStyle(ButtonStyle.Success);
                 const row = new ActionRowBuilder().addComponents(Delete,Archive);
                 setTimeout(delay, 3000);
                 function delay() {
                     ticketChannel.send({ embeds: [ticketEmbed] ,components: [row]})
                  }

            } catch (error) {
                console.log(error)
                interaction.reply({content: `The ticket category or Ticket staff role was deleted \nPlease run **/ticket disable** then **/ticket quicksetup** or **/ticket setup**`,ephemeral: true,})       
            }
             return;
        }
        if(buttonname ==='delete') {
            if(!(interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels))) return await interaction.reply({content: 'I do not have manageChannels permission', ephemeral: true})
            try {
                const channelTarget = interaction.channel
                channelTarget.delete();
               } catch (error) {
                interaction.reply({content: `Error while deleting ${error}`,ephemeral: true,})
               }
            return;
        }
        if(buttonname ==='archive') {
            let role = interaction.guild.roles;
            const ticket = await Ticket.findOne({ guildId: interaction.guild.id });
            if(!(interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels))) return await interaction.reply({content: 'I do not have manageChannels permission', ephemeral: true})
           
            try {
                const channelTarget = interaction.channel
               if (interaction.guild.roles.cache.some(role => role.id === ticket.role)) {
                channelTarget.permissionOverwrites.set([
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: ticket.role,
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    },
                ]);
                interaction.channel.setName(`${interaction.channel.name} Archived`)
                interaction.reply("**Ticket Archived**")
               } else {
                interaction.reply({content: `The Ticket staff role was deleted \nPlease run **/ticket disable** then **/ticket quicksetup** or **/ticket setup**`,ephemeral: true,})       
               } 
            } catch (error) {
                console.log(error)
                interaction.reply({content: `The ticket category or Ticket staff role was deleted \nPlease run **/ticket disable** then **/ticket quicksetup** or **/ticket setup**`,ephemeral: true,})       
            }
           
            return;
        }
    }
};