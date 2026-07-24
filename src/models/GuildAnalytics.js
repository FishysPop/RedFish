const { Schema, model } = require('mongoose');

const GuildAnalyticsSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  playCount: {
    type: Number,
    default: 0,
    index: true
  }
});

module.exports = model('GuildAnalytics', GuildAnalyticsSchema);
