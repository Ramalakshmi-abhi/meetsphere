const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    meetingId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        default: 'New Meeting'
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isLocked: {
        type: Boolean,
        default: false
    },
    passcode: {
        type: String
    },
    advancedOptions: {
        isRecurring: { type: Boolean, default: false },
        enableRecording: { type: Boolean, default: true },
        muteOnEntry: { type: Boolean, default: false },
        videoMuteOnEntry: { type: Boolean, default: false },
        disableScreenSharing: { type: Boolean, default: false },
        enableLivestream: { type: Boolean, default: false },
        recordingStorage: { type: String, enum: ['Local', 'Dropbox', 'Drive'], default: 'Local' }
    },
    isRecording: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Meeting', meetingSchema);
