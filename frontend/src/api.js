import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://73pq0x-ip-157-49-248-210.tunnelmole.net';


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
