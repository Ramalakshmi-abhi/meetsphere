const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        console.log('--- Auth Middleware Start ---');
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            console.log('No token provided');
            throw new Error('No token provided');
        }
        
        console.log('Verifying token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded:', decoded._id);
        
        const user = await User.findOne({ _id: decoded._id });
        if (!user) {
            console.log('User not found for token');
            throw new Error('User not found');
        }

        console.log('Auth successful for:', user.email);
        req.token = token;
        req.user = user;
        next();
    } catch (e) {
        console.error('Auth middleware error:', e.message);
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

module.exports = auth;
