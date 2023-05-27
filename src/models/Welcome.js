const { Schema, model } = require('mongoose');

const WelcomeSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  channel: {
    type: String,
    required: true,
  },
  type: {
    type: Number,  // 1 is only welcome | 2 is welcome and leaves | 3 is welcome and bans | 4 is welcome leaves and bans
    required: true,
    default: 1,
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