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

});

module.exports = model('GuildSettings', guildSettingsSchema);