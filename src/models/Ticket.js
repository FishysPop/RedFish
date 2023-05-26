const { Schema, model } = require('mongoose');

const ticketSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  Category: {
    type: String,
    required: true,
  },
  ticketNumber: {
    type: String,
    required: true,
  },
});

module.exports = model('Ticket', ticketSchema);