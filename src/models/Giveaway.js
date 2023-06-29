const { Schema, model } = require('mongoose');

const giveawaySchema = new Schema({
  messageId: {
    type: String,
    required: true,
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
    type: Array
  },
  giveawayEnd: {
    type: String,
    required: true,
  },
  ended: {
    type: Boolean
  },
  endedDate: {
   type: Date,
  }
});

module.exports = model('Giveaway', giveawaySchema);