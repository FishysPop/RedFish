const { EmbedBuilder, Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField} = require('discord.js')

player.events.on('playerStart', async (queue, track) => {
  if (!queue.guild.members.me.permissionsIn(queue.metadata.channel).has(PermissionsBitField.Flags.ViewChannel)) {
    return;
  }
  if (!queue.guild.members.me.permissionsIn(queue.metadata.channel).has(PermissionsBitField.Flags.SendMessages)) {
    return;
  }
    let requestedByString = track.requestedBy?.username ? `${track.requestedBy.username}#${track.requestedBy.discriminator}`
    : "AutoPlay" || `AutoPlay`

    if (track.queryType === 'arbitrary') { 
    const playerStartEmbed = await new EmbedBuilder() //embed
	.setColor('#e66229')
	.setTitle(track.title)
	.setURL(track.url)
	.setAuthor({ name: 'Now Streaming'})
	.setThumbnail('https://img.freepik.com/premium-vector/online-radio-station-vintage-icon-symbol_8071-25787.jpg')
    .setDescription(`Duration: **LIVE**`)
    .setTimestamp()
    .setFooter({ text: `Requested by ${requestedByString}`});
    const playPauseButton = new ButtonBuilder().setCustomId('Pause').setEmoji('<:w_playpause:1106270708243386428').setStyle(ButtonStyle.Primary);
    const skipButton = new ButtonBuilder().setCustomId('Skip').setEmoji('<:w_next:1106270714664849448').setStyle(ButtonStyle.Success);
    const stopButton = new ButtonBuilder().setCustomId('Stop').setEmoji('<:w_stop:1106272001909346386>').setStyle(ButtonStyle.Danger);
    const loopButton = new ButtonBuilder().setCustomId('Loop').setEmoji('<:w_loop:1106270705575792681>').setStyle(ButtonStyle.Secondary);
    const shuffleButton = new ButtonBuilder().setCustomId('Shuffle').setEmoji('<:w_shuffle:1106270712542531624>').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder()
   .addComponents(playPauseButton, skipButton, stopButton, loopButton, shuffleButton);
   
   try {
    
   queue.metadata.channel.send({ embeds: [playerStartEmbed] ,components: [row]})
  } catch (error) {
   console.error(`error while sending player event:${error}`); 
  }
   return;
  }


    const playerStartEmbed = await new EmbedBuilder() //embed
	.setColor('#e66229')
	.setTitle(track.title)
	.setURL(track.url)
	.setAuthor({ name: 'Now Playing'})
	.setThumbnail(track.thumbnail)
    .setDescription(`Duration: **${track.duration}**`)
    .setTimestamp()
    .setFooter({ text: `Requested by ${requestedByString}`});
    const playPauseButton = new ButtonBuilder().setCustomId('Pause').setEmoji('<:w_playpause:1106270708243386428').setStyle(ButtonStyle.Primary);
    const skipButton = new ButtonBuilder().setCustomId('Skip').setEmoji('<:w_next:1106270714664849448').setStyle(ButtonStyle.Success);
    const stopButton = new ButtonBuilder().setCustomId('Stop').setEmoji('<:w_stop:1106272001909346386>').setStyle(ButtonStyle.Danger);
    const loopButton = new ButtonBuilder().setCustomId('Loop').setEmoji('<:w_loop:1106270705575792681>').setStyle(ButtonStyle.Secondary);
    const shuffleButton = new ButtonBuilder().setCustomId('Shuffle').setEmoji('<:w_shuffle:1106270712542531624>').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder()
   .addComponents(playPauseButton, skipButton, stopButton, loopButton, shuffleButton);
   
  const message = await queue.metadata.channel.send({ embeds: [playerStartEmbed] ,components: [row]}).catch((err) => console.error(`error while sending player event:${err}`));
  let ms = Number(track.duration.split(':')[0])  * 60 * 1000 + Number(track.duration.split(':')[1])  * 1000;
  if (ms < '300000') {
  } else {
    ms = '300000'
  }
 const collector = message.createMessageComponentCollector({
    idle: ms,
  });
  collector.on("end", async () => {
    try {
      const fetchedMessage = await message.channel.messages.fetch(message.id)
    } catch (error) {
      return;
    }
    message.edit({
      components: [],
    });
  })
});

player.events.on("error", (queue, error) => {
  console.log(`[${queue.guild.name}] (ID:${queue.metadata.channel}) Error emitted from the queue: ${error.message}`);
})

player.events.on("playerError", async (queue, error) => {
  const playeErrorEmbed = await new EmbedBuilder() 
	.setColor('#e66229')
    .setDescription(`Oops, We failed to extract the song, skipping to the next!`)
  console.log(`[${queue.guild.name}] (ID:${queue.metadata.channel}) Error emitted from the player: ${error.message}`);
  queue.metadata.channel.send({ embeds: [playeErrorEmbed]})
});
