const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { ensureJwtSecret } = require('../config/runtime');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).send({ error: 'Please authenticate.' });
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).send({ error: 'Database is currently unavailable. Please try again in a moment.' });
        }

        const decoded = jwt.verify(token, ensureJwtSecret());
        const user = await User.findOne({ _id: decoded._id });
        if (!user) {
            return res.status(401).send({ error: 'Please authenticate.' });
        }

        req.token = token;
        req.user = user;
        next();
    } catch (e) {
        console.error('Auth middleware error:', e.message);
        res.status(e.statusCode || 401).send({ error: e.statusCode === 500 ? e.message : 'Please authenticate.' });
    }
};

module.exports = auth;
