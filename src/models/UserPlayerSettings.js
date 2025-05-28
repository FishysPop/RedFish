const { Schema, model } = require('mongoose');

const userPlayerSettingsSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  lastVote: {
    type: Date,
  },
  betaPlayer: {
    type: Boolean,
    default: false,
  },
  convertLinks: {
    type: Boolean,
    default: false,
  },
  defaultSearchEngine: {
    type: String,
    default: 'spotify',
  }
});

module.exports = model('UserPlayerSettings', userPlayerSettingsSchema);