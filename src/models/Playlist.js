const { Schema, model } = require('mongoose');


const TrackSchema = new Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    author: String,
    duration: String, 
    thumbnail: String,
    requestedBy: String, 
}, { _id: false });

const PlayListSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Playlist name is required.'], 
        trim: true,
        maxlength: [100, 'Playlist name cannot exceed 100 characters.'] 
    },
    description: {
        type: String,
        trim: true,
        default: '',
        maxlength: [500, 'Playlist description cannot exceed 500 characters.'] 
    },
    creatorId: {
        type: String,
        required: true,
        index: true, 
    },
    guildId: {
        type: String,
        required: true,
        index: true, 
    },
    tracks: [TrackSchema],
    isPublic: { 
        type: Boolean,
        required: true,
        default: false, 
    },
    views: { 
        type: Number,
        required: true,
        default: 0,
        min: [0, 'View count cannot be negative.'] 
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: { 
        type: Date,
        default: Date.now,
    },
});

PlayListSchema.index({ guildId: 1, creatorId: 1 }); 
PlayListSchema.index({ guildId: 1, name: 1 });     
PlayListSchema.index({ guildId: 1, isPublic: 1 });
PlayListSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

PlayListSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});


module.exports = model('Playlist', PlayListSchema);
