import axios from 'axios';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const DEFAULT_PUBLIC_ORIGIN = 'https://meetsphere-ten.vercel.app';
const DEFAULT_BACKEND_ORIGIN = 'https://meetsphere-production-6ae4.up.railway.app';
const configuredBaseUrl = trimTrailingSlash(import.meta.env.VITE_BACKEND_URL || '');
const configuredPublicOrigin = trimTrailingSlash(import.meta.env.VITE_PUBLIC_ORIGIN || '');
const configuredSocketUrl = trimTrailingSlash(import.meta.env.VITE_SOCKET_URL || '');
const configuredLiveKitUrl = trimTrailingSlash(import.meta.env.VITE_LIVEKIT_URL || '');
const browserHostname = window.location.hostname;
const isPrivateIpv4Host = /^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(browserHostname);
const isLocalDevHost = ['localhost', '127.0.0.1'].includes(browserHostname) || isPrivateIpv4Host;
export const IS_LOCAL_DEV_HOST = isLocalDevHost;
export const ENABLE_LIVEKIT = String(import.meta.env.VITE_ENABLE_LIVEKIT || '').toLowerCase() === 'true';

export const BASE_URL = configuredBaseUrl || (isLocalDevHost ? window.location.origin : DEFAULT_BACKEND_ORIGIN);
export const APP_ORIGIN = configuredPublicOrigin || window.location.origin || DEFAULT_PUBLIC_ORIGIN;
export const SOCKET_URL = configuredSocketUrl || (isLocalDevHost ? window.location.origin : BASE_URL);
export const LIVEKIT_URL = configuredLiveKitUrl;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getAbsoluteUrl = (path = '') => {
    if (!path) return '';
    if (/^(https?:)?\/\//.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
        return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const origin = BASE_URL || window.location.origin;
    return `${origin}${normalizedPath}`;
};

export const getMeetingUrl = (roomId) => {
    const normalizedRoomId = String(roomId || '').trim();
    return normalizedRoomId ? `${APP_ORIGIN}/room/${normalizedRoomId}` : APP_ORIGIN;
};

export const isTransientConnectionError = (error) => {
    if (!error) return false;
    if (error.code === 'ERR_NETWORK') return true;
    if (error.response) return false;

    const message = String(error.message || '').toLowerCase();
    return message.includes('network error')
        || message.includes('failed to fetch')
        || message.includes('connection')
        || message.includes('timeout');
};

export const waitForBackend = async ({ timeoutMs = 70000, intervalMs = 4000 } = {}) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${BASE_URL}/api/health`, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Bypass-Tunnel-Reminder': 'true'
                }
            });

            if (response.ok) {
                return true;
            }
        } catch {
            // Render free instances can close the first request while waking up.
        }

        await sleep(intervalMs);
    }

    return false;
};

export const withBackendRetry = async (requestFactory, { warmup = false } = {}) => {
    if (warmup) {
        await waitForBackend();
    }

    try {
        return await requestFactory();
    } catch (error) {
        if (!isTransientConnectionError(error)) {
            throw error;
        }

        const backendReady = await waitForBackend();
        if (!backendReady) {
            throw error;
        }

        return await requestFactory();
    }
};

export const getApiErrorMessage = (error, fallback = 'Request failed') => {
    if (error?.response?.data?.error) {
        return error.response.data.error;
    }

    if (isTransientConnectionError(error)) {
        return 'The meeting server is waking up or temporarily unavailable. Please try again in a moment.';
    }

    return error?.message || fallback;
};

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor to include the auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['Bypass-Tunnel-Reminder'] = 'true';
    return config;
});

export default api;
