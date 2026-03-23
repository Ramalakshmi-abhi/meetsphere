import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // BASE_URL is now centrally managed in src/api.js

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/api/auth/profile');
            setUser(res.data);
        } catch {
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const res = await api.post('/api/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const register = async (name, email, password) => {
        const res = await api.post('/api/auth/register', { name, email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const updateUser = (userData) => {
        setUser(userData);
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <div className="loading-screen">Loading...</div> : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
