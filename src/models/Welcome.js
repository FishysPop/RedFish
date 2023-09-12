const { Schema, model } = require('mongoose');

const WelcomeSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  channel: {
    type: Object,
    required: true,
  },
  typeArray: {
    type: Array,
    required: true,
  },
  welcomeMessage: {
    type: String,
    required: true,
  },
  banMessage: {
    type: String,
  },
  leaveMessage: {
    type: String,
  },
});

module.exports = model('Welcome', WelcomeSchema);