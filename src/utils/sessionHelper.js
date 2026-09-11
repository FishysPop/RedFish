function processSessionSaveState(player) {
  if (!player || !player.guildId) {
    return { action: 'ignore' };
  }

  const isIdle = !player.playing && !player.paused;
  const currentTrack = player.queue?.current || null;
  const queueTracks = Array.isArray(player.queue?.tracks) ? player.queue.tracks : [];

  if (isIdle || (!currentTrack && queueTracks.length === 0)) {
    return { action: 'delete', guildId: player.guildId };
  }

  const queueTracksToSave = queueTracks.map(t => ({
    encoded: t.encoded,
    info: t.info,
    requester: t.requester,
    userData: t.userData
  }));

  const currentTrackToSave = currentTrack ? {
    encoded: currentTrack.encoded,
    info: currentTrack.info,
    requester: currentTrack.requester,
    userData: currentTrack.userData
  } : null;

  return {
    action: 'save',
    data: {
      guildId: player.guildId,
      voiceChannelId: player.voiceChannelId,
      textChannelId: player.textChannelId || player.textId,
      volume: player.volume ?? 30,
      position: player.position || player.lastPosition || 0,
      playing: Boolean(player.playing),
      paused: Boolean(player.paused),
      selfDeaf: player.options?.selfDeaf ?? true,
      currentTrack: currentTrackToSave,
      requester: currentTrack?.requester,
      customData: player.customData || {},
      queueTracks: queueTracksToSave,
      updatedAt: new Date()
    }
  };
}

function processTrackEndState(player) {
  if (!player || !player.guildId) {
    return { action: 'ignore' };
  }

  const currentTrack = player.queue?.current || null;
  const queueTracks = Array.isArray(player.queue?.tracks) ? player.queue.tracks : [];

  if (!currentTrack && queueTracks.length === 0) {
    return { action: 'delete', guildId: player.guildId };
  }

  const queueTracksToSave = queueTracks.map(t => ({
    encoded: t.encoded,
    info: t.info,
    requester: t.requester,
    userData: t.userData
  }));

  const currentTrackToSave = currentTrack ? {
    encoded: currentTrack.encoded,
    info: currentTrack.info,
    requester: currentTrack.requester,
    userData: currentTrack.userData
  } : null;

  return {
    action: 'save',
    data: {
      guildId: player.guildId,
      voiceChannelId: player.voiceChannelId,
      textChannelId: player.textChannelId || player.textId,
      volume: player.volume ?? 30,
      position: 0,
      playing: true,
      paused: Boolean(player.paused),
      selfDeaf: player.options?.selfDeaf ?? true,
      currentTrack: currentTrackToSave || queueTracksToSave[0] || null,
      requester: currentTrack?.requester || queueTracksToSave[0]?.requester,
      customData: player.customData || {},
      queueTracks: currentTrackToSave ? queueTracksToSave : queueTracksToSave.slice(1),
      updatedAt: new Date()
    }
  };
}

function evaluateSessionRestoration(savedData, currentTime = Date.now()) {
  if (!savedData || !savedData.guildId) {
    return { shouldRestore: false, reason: 'invalid_data' };
  }

  const isIdle = savedData.playing === false && savedData.paused === false;
  if (isIdle) {
    return { shouldRestore: false, reason: 'idle_state' };
  }

  const currentTrack = savedData.currentTrack;
  const queueTracks = Array.isArray(savedData.queueTracks) ? savedData.queueTracks : [];

  if (!currentTrack && queueTracks.length === 0) {
    return { shouldRestore: false, reason: 'no_tracks' };
  }

  if (savedData.paused) {
    return {
      shouldRestore: true,
      currentTrack,
      position: savedData.position || 0,
      paused: true,
      remainingQueue: queueTracks
    };
  }

  const savedTime = savedData.updatedAt ? new Date(savedData.updatedAt).getTime() : currentTime;
  const elapsedMs = Math.max(0, currentTime - savedTime);

  const isCurrentStream = Boolean(currentTrack?.info?.isStream || (currentTrack?.info?.duration || 0) <= 0);
  if (isCurrentStream) {
    return {
      shouldRestore: true,
      currentTrack,
      position: 0,
      paused: false,
      remainingQueue: queueTracks
    };
  }

  const trackDuration = currentTrack?.info?.duration || 0;
  const currentPos = savedData.position || 0;
  const remainingInCurrent = Math.max(0, trackDuration - currentPos);

  if (elapsedMs < remainingInCurrent) {
    return {
      shouldRestore: true,
      currentTrack,
      position: currentPos + elapsedMs,
      paused: false,
      remainingQueue: queueTracks
    };
  }

  let leftoverMs = elapsedMs - remainingInCurrent;
  for (let i = 0; i < queueTracks.length; i++) {
    const candidate = queueTracks[i];
    const candDuration = candidate?.info?.duration || 0;
    const candIsStream = Boolean(candidate?.info?.isStream || candDuration <= 0);

    if (candIsStream) {
      return {
        shouldRestore: true,
        currentTrack: candidate,
        position: 0,
        paused: false,
        remainingQueue: queueTracks.slice(i + 1)
      };
    }

    if (leftoverMs < candDuration) {
      return {
        shouldRestore: true,
        currentTrack: candidate,
        position: leftoverMs,
        paused: false,
        remainingQueue: queueTracks.slice(i + 1)
      };
    }

    leftoverMs -= candDuration;
  }

  return { shouldRestore: false, reason: 'tracks_finished' };
}

module.exports = {
  processSessionSaveState,
  processTrackEndState,
  evaluateSessionRestoration
};
