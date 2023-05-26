const { Schema, model } = require('mongoose');

const ticketSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    required: true,
  },
  ticketNumber: {
    type: Number,
    default: 1,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
});

module.exports = model('Ticket', ticketSchema);