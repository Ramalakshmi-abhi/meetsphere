const User = require('../models/User');
const jwt = require('jsonwebtoken');

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
