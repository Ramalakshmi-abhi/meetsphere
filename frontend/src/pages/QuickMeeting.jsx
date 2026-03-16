import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, Mic, Camera, Settings } from 'lucide-react';
import api from '../api';
import './MenuPages.css';

const QuickMeeting = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        camera: true,
        mic: true,
        waitingRoom: false
    });

    const startInstant = async () => {
        setLoading(true);
        try {
            const res = await api.post('/api/meeting/schedule', {
                title: 'Instant Meeting',
                startTime: new Date().toISOString(),
                participants: []
            });
            navigate(`/room/${res.data.meetingId}`);
        } catch (err) {
            console.error(err);
            const id = Math.random().toString(36).substring(2, 10);
            navigate(`/room/${id}`);
        }
    };

    return (
        <div className="menu-page quick-meeting-page">
            <div className="hero-banner-compact">
                <div className="hero-text">
                    <h1>Quick Meeting</h1>
                    <p>Launch an ad-hoc meeting and share the link instantly.</p>
                </div>
                <Zap className="banner-icon" />
            </div>

            <div className="quick-config-grid">
                <div className="preview-card">
                    <div className="camera-preview-mock">
                        <Camera size={40} className="placeholder-cam" />
                        <div className="preview-overlay">
                            <span>Camera Preview</span>
                        </div>
                    </div>
                    <div className="controls-row">
                        <button 
                            className={`control-btn ${settings.camera ? 'active' : 'muted'}`}
                            onClick={() => {
                                setSettings(s => ({...s, camera: !s.camera}));
                                // Add logic for actual media stream if needed
                            }}
                            title={settings.camera ? 'Turn Camera Off' : 'Turn Camera On'}
                        >
                            <Camera size={20} />
                        </button>
                        <button 
                            className={`control-btn ${settings.mic ? 'active' : 'muted'}`}
                            onClick={() => setSettings(s => ({...s, mic: !s.mic}))}
                            title={settings.mic ? 'Mute Mic' : 'Unmute Mic'}
                        >
                            <Mic size={20} />
                        </button>
                        <button 
                            className="control-btn settings"
                            onClick={() => alert('Meeting settings and hardware configuration will open here.')}
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                <div className="launch-card">
                    <h3>Meeting Preferences</h3>
                    <div className="preference-list">
                        <div className="pref-item">
                            <div className="pref-info">
                                <Shield size={18} />
                                <div>
                                    <strong>Enable Waiting Room</strong>
                                    <span>Manually admit guests</span>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={settings.waitingRoom} 
                                onChange={(e) => setSettings(s => ({...s, waitingRoom: e.target.checked}))}
                            />
                        </div>
                    </div>

                    <button 
                        onClick={startInstant} 
                        className="start-instant-btn"
                        disabled={loading}
                    >
                        {loading ? 'Initializing...' : 'Start Now'}
                        <Zap size={20} />
                    </button>
                    <p className="start-hint">Invite links can be copied after joining.</p>
                </div>
            </div>
        </div>
    );
};

export default QuickMeeting;
