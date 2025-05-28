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
  guildPlayCount: [{  
    guildId: {       
      type: String,
      required: true
    },
    playCount: {    
      type: Number,
      default: 0
    },
    _id: false 
  }],
  failedPlayCount: {
    type: Number,
    required: true,
    default: 0
  },
  failedSearchCount: {
    type: Number,
    required: true,
    default: 0
  },
  index: true 
});

module.exports = model('Analytics', AnalyticsSchema);