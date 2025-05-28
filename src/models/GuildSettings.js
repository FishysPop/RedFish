const { Schema, model } = require('mongoose');

const guildSettingsSchema = new Schema({
  levels: {
    type: Boolean,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
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
  },
  index: true 

});

module.exports = model('GuildSettings', guildSettingsSchema);