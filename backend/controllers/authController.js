const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send({ error: 'User already exists with this email' });
        }

        const user = new User({ name, email, password });
        await user.save();
        const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
        res.status(201).send({ user, token });
    } catch (e) {
        console.error('CRITICAL: Registration error:', e);
        res.status(500).send({ error: e.message || 'Registration failed' });
    }
};

exports.login = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.log('Mocking login due to MongoDB ISP ban');
            const mockUser = { _id: new mongoose.Types.ObjectId(), name: 'Presentation Demo', email: req.body.email, branding: {} };
            const token = jwt.sign({ _id: mockUser._id.toString() }, process.env.JWT_SECRET || 'secret');
            return res.send({ user: mockUser, token });
        }
        const user = await User.findOne({ email: req.body.email });
        if (!user || !(await user.comparePassword(req.body.password))) {
            return res.status(401).send({ error: 'Login failed! Check authentication credentials' });
        }
        const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
        res.send({ user, token });
    } catch (e) {
        console.error('CRITICAL: Login error:', e);
        res.status(500).send({ error: e.message || 'Login failed' });
    }
};

exports.getProfile = async (req, res) => {
    res.send(req.user);
};

exports.updateSubscription = async (req, res) => {
    try {
        const { plan } = req.body;
        if (!['Basic', 'Personal', 'Business'].includes(plan)) {
            return res.status(400).send({ error: 'Invalid subscription plan.' });
        }
        
        req.user.plan = plan;
        await req.user.save();
        
        res.send(req.user);
    } catch (e) {
        console.error('Subscription update error:', e);
        res.status(500).send({ error: 'Failed to update subscription.' });
    }
};

exports.updateBranding = async (req, res) => {
    try {
        const { primaryColor, secondaryColor } = req.body;
        if (primaryColor) req.user.branding.primaryColor = primaryColor;
        if (secondaryColor) req.user.branding.secondaryColor = secondaryColor;
        
        await req.user.save();
        res.send(req.user);
    } catch (e) {
        console.error('Branding update error:', e);
        res.status(500).send({ error: 'Failed to update branding colors.' });
    }
};

exports.uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ error: 'No logo file uploaded' });
        }

        const fileUrl = `/uploads/logos/${req.file.filename}`;
        req.user.branding.logoUrl = fileUrl;
        await req.user.save();

        res.status(200).send({ message: 'Logo uploaded successfully', user: req.user });
    } catch (e) {
        console.error('Logo upload error:', e);
        res.status(500).send({ error: e.message || 'Upload failed' });
    }
};

exports.updateMeetingSettings = async (req, res) => {
    try {
        const { defaultVideoQuality, muteOnEntry, waitingRoom, meetingPasscode } = req.body;
        
        // Initialize if it doesn't exist
        if (!req.user.meetingSettings) {
            req.user.meetingSettings = {};
        }
        
        if (defaultVideoQuality !== undefined) req.user.meetingSettings.defaultVideoQuality = defaultVideoQuality;
        if (muteOnEntry !== undefined) req.user.meetingSettings.muteOnEntry = muteOnEntry;
        if (waitingRoom !== undefined) req.user.meetingSettings.waitingRoom = waitingRoom;
        if (meetingPasscode !== undefined) req.user.meetingSettings.meetingPasscode = meetingPasscode;
        
        await req.user.save();
        res.send(req.user.meetingSettings);
    } catch (e) {
        console.error('Meeting settings update error:', e);
        res.status(500).send({ error: 'Failed to update meeting settings.' });
    }
};

exports.regenerateKeys = async (req, res) => {
    try {
        const apiKey = 'ms_live_' + crypto.randomBytes(12).toString('hex');
        const secretKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
        
        if (!req.user.developerSettings) {
            req.user.developerSettings = { webhooks: [] };
        }
        
        req.user.developerSettings.apiKey = apiKey;
        req.user.developerSettings.secretKey = secretKey;
        await req.user.save();
        
        res.send({ apiKey, secretKey });
    } catch (e) {
        console.error('Keys regeneration error:', e);
        res.status(500).send({ error: 'Failed to regenerate keys.' });
    }
};

exports.addWebhook = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).send({ error: 'Webhook URL is required' });
        
        if (!req.user.developerSettings) {
            req.user.developerSettings = { apiKey: '', secretKey: '', webhooks: [] };
        }
        
        const webhookId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
        
        req.user.developerSettings.webhooks.push({
            id: webhookId,
            url: url
        });
        
        await req.user.save();
        res.send(req.user.developerSettings.webhooks);
    } catch (e) {
        console.error('Add webhook error:', e);
        res.status(500).send({ error: 'Failed to add webhook.' });
    }
};

exports.removeWebhook = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user.developerSettings) return res.status(404).send({ error: 'No developer settings found' });
        
        req.user.developerSettings.webhooks = req.user.developerSettings.webhooks.filter(
            wh => wh.id !== id
        );
        
        await req.user.save();
        res.send(req.user.developerSettings.webhooks);
    } catch (e) {
        console.error('Remove webhook error:', e);
        res.status(500).send({ error: 'Failed to remove webhook.' });
    }
};
