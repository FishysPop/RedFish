const { Schema, model } = require('mongoose');

const giveawaySchema = new Schema({
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  messageId: {
    type: String,
    required: true,
    index: true, 
  },
  messageTitle: {
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
  entriesArray: {
    type: Array,
  },
  giveawayEnd: {
    type: Date,
    required: true,
  },
  ended: {
    type: Boolean,
    default: false,
  },
  endedDate: {
    type: Date,
  },
});

giveawaySchema.index({ ended: 1, giveawayEnd: 1 });
giveawaySchema.index({ guildId: 1 });

module.exports = model('Giveaway', giveawaySchema);