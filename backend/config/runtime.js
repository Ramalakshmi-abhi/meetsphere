const mongoose = require('mongoose');

function getJwtSecret() {
    return process.env.JWT_SECRET || '';
}

function ensureJwtSecret() {
    const secret = getJwtSecret();
    if (!secret) {
        const error = new Error('JWT_SECRET is not configured');
        error.statusCode = 500;
        throw error;
    }

    return secret;
}

function isDatabaseConnected() {
    return mongoose.connection.readyState === 1;
}

function ensureDatabaseConnected() {
    if (!isDatabaseConnected()) {
        const error = new Error('Database is currently unavailable. Please try again in a moment.');
        error.statusCode = 503;
        throw error;
    }
}

module.exports = {
    ensureDatabaseConnected,
    ensureJwtSecret,
    getJwtSecret,
    isDatabaseConnected,
};
