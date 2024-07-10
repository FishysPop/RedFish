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

});

module.exports = model('GuildSettings', guildSettingsSchema);