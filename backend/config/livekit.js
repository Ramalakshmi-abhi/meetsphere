const { AccessToken } = require('livekit-server-sdk');

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const normalizeLiveKitUrl = (value = '') => {
    const normalized = trimTrailingSlash(String(value || '').trim());
    if (!normalized) {
        return '';
    }

    if (normalized.startsWith('http://')) {
        return `ws://${normalized.slice('http://'.length)}`;
    }

    if (normalized.startsWith('https://')) {
        return `wss://${normalized.slice('https://'.length)}`;
    }

    return normalized;
};

const getLiveKitConfig = () => ({
    url: normalizeLiveKitUrl(process.env.LIVEKIT_URL),
    apiKey: String(process.env.LIVEKIT_API_KEY || '').trim(),
    apiSecret: String(process.env.LIVEKIT_API_SECRET || '').trim(),
});

const ensureLiveKitConfigured = () => {
    const config = getLiveKitConfig();
    if (config.url && config.apiKey && config.apiSecret) {
        return config;
    }

    const error = new Error('LiveKit is not configured yet. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to the backend environment.');
    error.statusCode = 503;
    throw error;
};

const createLiveKitToken = async ({
    roomName,
    participantName,
    participantIdentity,
    metadata,
    ttl = '2h',
}) => {
    const { url, apiKey, apiSecret } = ensureLiveKitConfigured();

    const token = new AccessToken(apiKey, apiSecret, {
        identity: participantIdentity,
        name: participantName,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        ttl,
    });

    token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
    });

    return {
        token: await token.toJwt(),
        url,
    };
};

module.exports = {
    createLiveKitToken,
    ensureLiveKitConfigured,
    getLiveKitConfig,
    normalizeLiveKitUrl,
};
