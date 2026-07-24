const { Schema, model } = require('mongoose');

const AnalyticsSchema = new Schema({
  totalPlayCount: {
    type: Number,
    required: true,
    default: 0
  },
  playHasPlayerSettingsCount: {
    type: Number,
    required: true,
    default: 0
  },
  usedSearchEngines: {
    type: Map,  
    of: Number
  },
  failedPlayCount: {
    type: Number,
    required: true,
    default: 0
  },
  failedSearchCount: {
    type: Number,
    required: true,
    default: 0
  }
});

module.exports = model('Analytics', AnalyticsSchema);