const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getAvailableNodes, migratePlayerNode } = require('./nodeFallbackHelper');
const handleExcessiveLavalinkErrors = require('./handleExcessiveLavaErrors');

async function handleTrackStuck({ player, track, payload, client, migrateFn = migratePlayerNode }) {
  if (!player) return { migrated: false, resumed: false, skipped: false, exhausted: false, alternateSourceUsed: false };

  const manager = player.LavalinkManager || player.manager || client?.manager;
  const initialNodeId = player.node?.id || player.node?.options?.id || 'Unknown Node';
  const trackToUse = track || player.queue?.current || payload?.track;
  const trackTitle = trackToUse?.info?.title || trackToUse?.title || 'Unknown Track';
  const trackAuthor = trackToUse?.info?.author || trackToUse?.author || '';
  const trackIdentifier = trackToUse?.info?.identifier || trackToUse?.identifier || trackTitle;

  player.customData = player.customData || {};
  if (!player.customData._stuckNodeAttempts || player.customData._stuckTrackId !== trackIdentifier) {
    player.customData._stuckTrackId = trackIdentifier;
    player.customData._stuckNodeAttempts = [];
  }

  const attemptedNodes = player.customData._stuckNodeAttempts;
  if (!attemptedNodes.includes(initialNodeId)) {
    attemptedNodes.push(initialNodeId);
  }

  const availableNodes = getAvailableNodes(manager, initialNodeId);
  const untriedNodes = availableNodes.filter(n => !attemptedNodes.includes(n.id));

  let wasMigrated = false;
  let retrySuccess = false;
  let skipped = false;
  let exhausted = false;
  let alternateSourceUsed = false;

  if (untriedNodes.length > 0) {
    const targetNode = untriedNodes[0];
    try {
      await migrateFn(player, targetNode, client);
      const currentNodeId = player.node?.id || player.node?.options?.id;
      wasMigrated = Boolean(currentNodeId && currentNodeId !== initialNodeId && player.node?.connected && !player.node?.isDemoted);
      if (wasMigrated && !attemptedNodes.includes(currentNodeId)) {
        attemptedNodes.push(currentNodeId);
      }
    } catch (migErr) {
      console.error(`[trackStuck] Failed to migrate player ${player.guildId} from ${initialNodeId} to ${targetNode.id}:`, migErr);
    }
  }

  const currentNodeId = player.node?.id || player.node?.options?.id || initialNodeId;

  if (wasMigrated && trackToUse) {
    try {
      await player.play({
        track: trackToUse,
        position: player.position || player.lastPosition || 0
      });
      retrySuccess = true;
    } catch (playErr) {
      try {
        const query = trackToUse.info?.uri || `${trackTitle} ${trackAuthor}`.trim();
        const searchResult = await player.search(query, trackToUse.userData?.requester || trackToUse.requester);
        if (searchResult?.tracks?.length > 0) {
          await player.play({ track: searchResult.tracks[0] });
          retrySuccess = true;
        }
      } catch {}
    }
  }

  if (!wasMigrated) {
    const isSingleNodeSetup = availableNodes.length === 0 && attemptedNodes.length <= 1;

    if (isSingleNodeSetup && trackToUse) {
      const lastStuckKey = player.customData._lastStuckSingleRetry;
      if (lastStuckKey !== trackIdentifier) {
        player.customData._lastStuckSingleRetry = trackIdentifier;
        try {
          await player.play({ track: trackToUse });
          retrySuccess = true;
        } catch {}
      }
    }

    if (!retrySuccess) {
      const fallbackQueries = [];
      const cleanTitle = `${trackTitle} ${trackAuthor}`.trim();
      const rawSource = (trackToUse?.info?.sourceName || '').toLowerCase();

      if (rawSource.includes('youtube')) {
        fallbackQueries.push(`scsearch:${cleanTitle}`);
        fallbackQueries.push(`spsearch:${cleanTitle}`);
      } else {
        fallbackQueries.push(`ytmsearch:${cleanTitle}`);
        fallbackQueries.push(`scsearch:${cleanTitle}`);
      }

      for (const query of fallbackQueries) {
        try {
          const res = await player.search(query, trackToUse?.userData?.requester || trackToUse?.requester);
          if (res?.tracks?.length > 0) {
            await player.play({ track: res.tracks[0] });
            retrySuccess = true;
            alternateSourceUsed = true;
            break;
          }
        } catch {}
      }
    }

    if (!retrySuccess) {
      exhausted = true;
      const hasUpcoming = Array.isArray(player.queue?.tracks) && player.queue.tracks.length > 0;
      if (hasUpcoming && typeof player.skip === 'function') {
        try {
          await player.skip();
          skipped = true;
        } catch {}
      } else if (player.node && typeof player.node.updatePlayer === 'function') {
        await player.node.updatePlayer({
          guildId: player.guildId,
          playerOptions: { track: { encoded: null } }
        }).catch(() => {});
      }
    }
  }

  if (typeof handleExcessiveLavalinkErrors === 'function') {
    const stuckError = new Error(`Track stuck threshold surpassed (${payload?.thresholdMs || 10000}ms)`);
    await handleExcessiveLavalinkErrors(player, manager, { track: trackToUse, error: stuckError }).catch(() => {});
  }

  if (player.customData?.playerMessages === 'noMessage') {
    return { migrated: wasMigrated, resumed: retrySuccess, skipped, exhausted, alternateSourceUsed };
  }

  const textChannelId = player.textId || player.textChannelId;
  const channel = client?.channels?.cache?.get(textChannelId);
  const guild = client?.guilds?.cache?.get(player.guildId);

  if (!channel) {
    return { migrated: wasMigrated, resumed: retrySuccess, skipped, exhausted, alternateSourceUsed };
  }

  if (guild?.members?.me) {
    const permissions = guild.members.me.permissionsIn(channel);
    if (!permissions.has(PermissionsBitField.Flags.ViewChannel) || !permissions.has(PermissionsBitField.Flags.SendMessages)) {
      return { migrated: wasMigrated, resumed: retrySuccess, skipped, exhausted, alternateSourceUsed };
    }
  }

  let title = 'Playback Stuck';
  let description = '';
  const hasUpcoming = Array.isArray(player.queue?.tracks) && player.queue.tracks.length > 0;

  if (alternateSourceUsed) {
    title = 'Audio Source Switched';
    description = `Track **${trackTitle}** got stuck on server \`${initialNodeId}\`. Switched to an alternative audio provider and resumed playback.`;
  } else if (exhausted) {
    const isMultiNode = attemptedNodes.length > 1;
    const nodesList = attemptedNodes.join('`, `');
    if (skipped) {
      title = isMultiNode ? 'Playback Failed Across All Servers - Skipping Track' : 'Playback Stuck - Skipping Track';
      description = isMultiNode
        ? `Track **${trackTitle}** got stuck across all available audio servers (\`${nodesList}\`). Skipping to next track in queue.`
        : `Track **${trackTitle}** got stuck on server \`${initialNodeId}\` (audio stream stalled). Skipping to next track in queue.`;
    } else {
      title = isMultiNode ? 'Playback Failed Across All Servers' : 'Playback Stuck';
      description = isMultiNode
        ? `Track **${trackTitle}** got stuck across all available audio servers (\`${nodesList}\`). Playback was stopped. Please try playing a different track.`
        : `Track **${trackTitle}** got stuck on server \`${initialNodeId}\` (audio stream stalled). Please try playing your track again.`;
    }

    if (availableNodes.length === 0 && !isMultiNode) {
      description += `\n\n-# Tip: No backup audio servers are configured in your bot settings. Configure multiple nodes in LAVALINK_URI for automatic server failover.`;
    }
  } else if (wasMigrated) {
    if (retrySuccess) {
      title = 'Audio Server Switched';
      description = `Server \`${initialNodeId}\` encountered a playback issue (track got stuck). Switched to backup server \`${currentNodeId}\` and resumed **${trackTitle}**.`;
    } else if (hasUpcoming) {
      title = 'Audio Server Switched - Skipping Track';
      description = `Server \`${initialNodeId}\` encountered an issue (track got stuck). Switched to backup server \`${currentNodeId}\`. Could not resume **${trackTitle}**, playing next track in queue.`;
    } else {
      title = 'Audio Server Switched';
      description = `Server \`${initialNodeId}\` encountered an issue (track got stuck). Playback was moved to backup server \`${currentNodeId}\`. Please try playing your track again.`;
    }
  } else {
    if (retrySuccess) {
      title = 'Playback Recovered';
      description = `Track **${trackTitle}** stalled on server \`${initialNodeId}\` and was restarted.`;
    } else if (hasUpcoming) {
      title = 'Playback Stuck - Skipping Track';
      description = `Track **${trackTitle}** got stuck on server \`${initialNodeId}\` (audio stream stalled). Skipping to next track in queue.`;
    } else {
      title = 'Playback Stuck';
      description = `Track **${trackTitle}** got stuck on server \`${initialNodeId}\` (audio stream stalled). Please try playing your track again.`;
    }

    if (availableNodes.length === 0) {
      description += `\n\n-# Tip: No backup audio servers are configured in your bot settings. Configure multiple nodes in LAVALINK_URI for automatic server failover.`;
    }
  }

  const embed = new EmbedBuilder()
    .setColor('#e66229')
    .setTitle(title)
    .setDescription(description);

  const nowPlayingMessage = player.customData?.message;
  player.customData.message = null;

  let targetMessage = null;
  if (nowPlayingMessage && typeof nowPlayingMessage.edit === 'function') {
    targetMessage = await nowPlayingMessage.edit({ embeds: [embed], components: [] }).catch(err => {
      if (err.code !== 50013 && err.code !== 10008) console.error('Error editing message on track stuck:', err);
      return null;
    });
  }

  if (!targetMessage && typeof channel.send === 'function') {
    targetMessage = await channel.send({ embeds: [embed] }).catch(err => {
      if (err.code !== 50013) console.error('Error sending message on track stuck:', err);
      return null;
    });
  }

  if (targetMessage && player.customData?.playerMessages === 'deleteAfter') {
    const timer = setTimeout(() => {
      targetMessage.delete().catch(err => {
        if (err.code !== 50013 && err.code !== 10008) console.error('Error deleting stuck message:', err);
      });
    }, 15000);
    if (typeof timer?.unref === 'function') timer.unref();
  }

  return { migrated: wasMigrated, resumed: retrySuccess, skipped, exhausted, alternateSourceUsed };
}

module.exports = {
  handleTrackStuck
};
