const { Schema, model } = require('mongoose');

const giveawaySchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  messageId: {
    type: String,
    required: true,
  },
  winners: {
    type: Number,
    default: 1,
    required: true,
  },
  requiredRole: {
    type: String,
  },
});

module.exports = model('Giveaway', giveawaySchema);