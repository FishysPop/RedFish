const { Schema, model } = require('mongoose');

const WelcomeSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: Number,  // 1 is only welcome | 2 is welcome and leaves | 3 is welcome and bans | 4 is welcome leaves and bans
    required: true,
    default: 1,
  },
  welcomeMessage: {
    type: String,
    default: "has joined.",
    required: true,
  },
  banMessage: {
    type: String,
    default: "has been banned.",
    required: true,
  },
  leaveMessage: {
    type: String,
    default: "has left the server.",
    required: true,
  },

});

module.exports = model('Welcome', WelcomeSchema);