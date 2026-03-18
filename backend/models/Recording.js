const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
    meetingId: {
        type: String,
        required: true,
        index: true
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        default: 0
    },
    sizeBytes: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Recording', recordingSchema);
