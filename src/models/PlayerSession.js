const { Schema, model } = require("mongoose");

const playerSessionSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  voiceChannelId: {
    type: String,
    required: true,
  },
  textChannelId: {
    type: String,
  },
  selfDeaf: {
    type: Boolean,
    default: true,
  },
  requester: {
    type: Schema.Types.Mixed,
  },
  customData: {
    type: Schema.Types.Mixed,
  },
  currentTrack: {
    type: Schema.Types.Mixed,
  },
  volume: {
    type: Number,
    default: 30,
  },
  position: {
    type: Number,
    default: 0,
  },
  paused: {
    type: Boolean,
    default: false,
  },
  queueTracks: {
    type: Array,
    default: [],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("PlayerSession", playerSessionSchema);
