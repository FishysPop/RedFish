function safeSanitize(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (seen.has(value)) {
    return undefined;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .map(item => safeSanitize(item, seen))
      .filter(item => item !== undefined);
  }

  if (value.client || value.guild || value.channel || typeof value.send === 'function') {
    if (value.id && (value.username || value.user)) {
      return sanitizeRequester(value);
    }
    return undefined;
  }

  const result = {};
  for (const [key, val] of Object.entries(value)) {
    if (key === 'client' || key === 'guild' || key === 'channel' || key === 'message') {
      continue;
    }
    if (typeof val === 'function' || typeof val === 'symbol') {
      continue;
    }
    const cleaned = safeSanitize(val, seen);
    if (cleaned !== undefined) {
      result[key] = cleaned;
    }
  }
  return result;
}

function sanitizeRequester(requester) {
  if (!requester) return null;
  if (typeof requester === 'string') return requester;
  if (typeof requester === 'object') {
    const raw = requester.requester || requester.user || requester;
    if (typeof raw === 'string') return raw;
    const sanitized = {};
    if (raw.id) sanitized.id = String(raw.id);
    if (raw.username) sanitized.username = String(raw.username);
    if (raw.globalName) sanitized.globalName = String(raw.globalName);
    if (raw.discriminator && raw.discriminator !== '0') sanitized.discriminator = String(raw.discriminator);
    if (raw.avatar) sanitized.avatar = String(raw.avatar);
    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }
  return null;
}

function sanitizeCustomData(customData) {
  if (!customData || typeof customData !== 'object') return {};
  const cleaned = {};
  for (const [key, val] of Object.entries(customData)) {
    if (key === 'message' || key === 'client' || key === 'guild' || key === 'channel') continue;
    if (typeof val === 'function' || typeof val === 'symbol') continue;
    const sanitized = safeSanitize(val);
    if (sanitized !== undefined) {
      cleaned[key] = sanitized;
    }
  }
  return cleaned;
}

function sanitizeTrack(track) {
  if (!track) return null;
  return {
    encoded: track.encoded || null,
    info: track.info ? safeSanitize(track.info) : null,
    requester: sanitizeRequester(track.requester),
    userData: track.userData ? safeSanitize(track.userData) : {}
  };
}

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

  const queueTracksToSave = queueTracks.map(sanitizeTrack).filter(Boolean);
  const currentTrackToSave = sanitizeTrack(currentTrack);

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
      requester: sanitizeRequester(currentTrack?.requester),
      customData: sanitizeCustomData(player.customData),
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

  const queueTracksToSave = queueTracks.map(sanitizeTrack).filter(Boolean);
  const currentTrackToSave = sanitizeTrack(currentTrack);
  const nextTrack = currentTrackToSave || queueTracksToSave[0] || null;

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
      currentTrack: nextTrack,
      requester: sanitizeRequester(currentTrack?.requester || queueTracksToSave[0]?.requester),
      customData: sanitizeCustomData(player.customData),
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
  evaluateSessionRestoration,
  safeSanitize,
  sanitizeRequester,
  sanitizeCustomData,
  sanitizeTrack
};
