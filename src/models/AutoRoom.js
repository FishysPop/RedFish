const { Schema, model } = require('mongoose');

const autoroomSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  channelName: {
    type: String,
    required: true,
  },
  autoroomArray: {
    type: Array,
  },
});

module.exports = model('AutoRoom', autoroomSchema);