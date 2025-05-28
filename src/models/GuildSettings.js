const { Schema, model } = require('mongoose');

const guildSettingsSchema = new Schema({
  levels: {
    type: Boolean,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  defaultVolume: {
    type: Number,
  },
  playerMessages: {
    type: String,
    default: "default",
  },
  preferredNode: {
    type: String,
    default: null,
  }
});

module.exports = model('GuildSettings', guildSettingsSchema);