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
