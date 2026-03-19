const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        default: ''
    },
    branding: {
        primaryColor: { type: String, default: '#6366f1' },
        secondaryColor: { type: String, default: '#1e293b' },
        logoUrl: { type: String, default: '' }
    },
    plan: {
        type: String,
        enum: ['Basic', 'Personal', 'Business'],
        default: 'Basic'
    },
    meetingSettings: {
        defaultVideoQuality: { type: String, default: 'High Definition (720p)' },
        muteOnEntry: { type: Boolean, default: true },
        waitingRoom: { type: Boolean, default: false },
        meetingPasscode: { type: Boolean, default: true }
    },
    developerSettings: {
        apiKey: { type: String, default: '' },
        secretKey: { type: String, default: '' },
        webhooks: [{
            id: { type: String, required: true },
            url: { type: String, required: true }
        }]
    },
    meetingHistory: [{
        meetingId: String,
        date: {
            type: Date,
            default: Date.now
        },
        role: String // host or participant
    }]
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', function() {
    if (!this.isModified('password')) return Promise.resolve();
    
    return bcrypt.hash(this.password, 10).then(hash => {
        this.password = hash;
    });
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
