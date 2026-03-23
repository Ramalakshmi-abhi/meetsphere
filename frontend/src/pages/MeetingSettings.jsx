import React, { useState, useEffect } from 'react';
import { Shield, Monitor } from 'lucide-react';
import api from '../api';
import './MenuPages.css';

const MeetingSettings = () => {
    const [settings, setSettings] = useState({
        defaultVideoQuality: 'High Definition (720p)',
        muteOnEntry: true,
        waitingRoom: false,
        meetingPasscode: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (!localStorage.getItem('token')) {
                    setLoading(false);
                    return;
                }
                const response = await api.get('/api/auth/profile');
                if (response.data && response.data.meetingSettings) {
                    setSettings(prev => ({ ...prev, ...response.data.meetingSettings }));
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            await api.put('/api/auth/meeting-settings', settings);
            setMessage('Settings saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage('Failed to save settings.');
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="menu-page">
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Meeting Settings</h1>
                <button 
                    className="btn-primary-sm" 
                    onClick={handleSave} 
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            
            {message && (
                <div style={{
                    padding: '10px 15px', 
                    marginBottom: '20px', 
                    borderRadius: '6px',
                    backgroundColor: message.includes('success') ? '#d1fae5' : '#fee2e2',
                    color: message.includes('success') ? '#065f46' : '#991b1b',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    {message}
                </div>
            )}

            <div className="settings-container-v2">
                <section className="settings-section">
                    <div className="section-header">
                        <Monitor size={20} />
                        <h3>Video & Audio</h3>
                    </div>
                    <div className="settings-row">
                        <div className="setting-info">
                            <strong>Default Video Quality</strong>
                            <span>Choose the default resolution for your meetings.</span>
                        </div>
                        <select 
                            className="setting-select"
                            name="defaultVideoQuality"
                            value={settings.defaultVideoQuality}
                            onChange={handleChange}
                        >
                            <option value="High Definition (720p)">High Definition (720p)</option>
                            <option value="Full HD (1080p)">Full HD (1080p)</option>
                            <option value="Standard (480p)">Standard (480p)</option>
                        </select>
                    </div>
                    <div className="settings-row">
                        <div className="setting-info">
                            <strong>Mute on Entry</strong>
                            <span>Participants will be muted when they join.</span>
                        </div>
                        <input 
                            type="checkbox" 
                            className="switch" 
                            name="muteOnEntry"
                            checked={settings.muteOnEntry}
                            onChange={handleChange}
                        />
                    </div>
                </section>

                <section className="settings-section">
                    <div className="section-header">
                        <Shield size={20} />
                        <h3>Security</h3>
                    </div>
                    <div className="settings-row">
                        <div className="setting-info">
                            <strong>Waiting Room</strong>
                            <span>Guests must be admitted by the host.</span>
                        </div>
                        <input 
                            type="checkbox" 
                            className="switch" 
                            name="waitingRoom"
                            checked={settings.waitingRoom}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="settings-row">
                        <div className="setting-info">
                            <strong>Meeting Passcode</strong>
                            <span>Require a passcode for all scheduled meetings.</span>
                        </div>
                        <input 
                            type="checkbox" 
                            className="switch" 
                            name="meetingPasscode"
                            checked={settings.meetingPasscode}
                            onChange={handleChange}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
};

export default MeetingSettings;
