import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, Mic, MicOff, Camera, CameraOff, Settings } from 'lucide-react';
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
    
    // Live camera preview state
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);

    const [loadingHardware, setLoadingHardware] = useState(true);
    const [hardwareError, setHardwareError] = useState(null);

    // Initialize media stream on mount
    useEffect(() => {
        let activeStream = null;
        const initMedia = async () => {
            try {
                activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(activeStream);
            } catch (err) {
                console.error("Failed to access camera/mic for preview:", err);
                setSettings(s => ({ ...s, camera: false, mic: false }));
                setHardwareError("Please allow camera & microphone permissions.");
            } finally {
                setLoadingHardware(false);
            }
        };

        if (navigator.mediaDevices) {
            initMedia();
        } else {
            setLoadingHardware(false);
            setHardwareError("Hardware not supported.");
        }

        return () => {
            // Clean up the tracks when leaving the Quick Meeting page
            if (activeStream) {
                activeStream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const retryMedia = async () => {
        setLoadingHardware(true);
        setHardwareError(null);
        try {
            const activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(activeStream);
            setSettings(s => ({ ...s, camera: true, mic: true }));
        } catch (err) {
            console.error("Retry failed:", err);
            setHardwareError("Please allow camera & microphone permissions.");
            setSettings(s => ({ ...s, camera: false, mic: false }));
        } finally {
            setLoadingHardware(false);
        }
    };

    const toggleCamera = () => {
        if (!stream) {
            if (!settings.camera) retryMedia();
            return;
        }
        setSettings(s => ({ ...s, camera: !s.camera }));
    };

    const toggleMic = () => {
        if (!stream) {
            if (!settings.mic) retryMedia();
            return;
        }
        setSettings(s => ({ ...s, mic: !s.mic }));
    };

    // Ensure the stream is strictly attached whenever the video DOM element becomes available
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, settings.camera]);

    // Effect to toggle the physical tracks when the buttons are clicked
    useEffect(() => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];
            
            if (videoTrack) videoTrack.enabled = settings.camera;
            if (audioTrack) audioTrack.enabled = settings.mic;
        }
    }, [settings.camera, settings.mic, stream]);

    const startInstant = async () => {
        setLoading(true);
        // Stop the local preview tracks so MeetingRoom can grab them fresh
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }

        try {
            // Create meeting in the backend
            const res = await api.post('/api/meeting/schedule', {
                title: 'Instant Meeting',
                startTime: new Date().toISOString(),
                participants: [],
                isLocked: settings.waitingRoom // Enforce Waiting Room setting
            });
            
            // Navigate to the room, carrying over the explicit hardware overrides
            navigate(`/room/${res.data.meetingId}`, {
                state: {
                    camera: settings.camera,
                    mic: settings.mic,
                    isLocked: settings.waitingRoom
                }
            });
        } catch (err) {
            console.error(err);
            const id = Math.random().toString(36).substring(2, 10);
            navigate(`/room/${id}`, {
                state: {
                    camera: settings.camera,
                    mic: settings.mic,
                    isLocked: settings.waitingRoom
                }
            });
        }
    };

    return (
        <div className="menu-page quick-meeting-page">
            <div className="hero-banner-compact">
                <div className="hero-text">
                    <h1>Quick Meeting</h1>
                    <p>Launch an ad-hoc meeting and set up your hardware instantly.</p>
                </div>
                <Zap className="banner-icon" />
            </div>

            <div className="quick-config-grid">
                <div className="preview-card">
                    <div className="camera-preview-mock" style={{ padding: 0, overflow: 'hidden', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        {loadingHardware ? (
                            <div style={{ color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                <Zap size={24} className="loading-pulse" style={{ opacity: 0.5 }} />
                                <span style={{ fontSize: '0.875rem' }}>Accessing hardware...</span>
                            </div>
                        ) : stream && settings.camera ? (
                            <video 
                                ref={videoRef}
                                autoPlay 
                                playsInline 
                                muted 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#64748b' }}>
                                <CameraOff size={48} style={{ opacity: 0.7 }} />
                                <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                                    {hardwareError || "Camera is Off"}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="controls-row">
                        <button 
                            className={`control-btn ${settings.camera ? 'active' : 'muted'}`}
                            onClick={toggleCamera}
                            title={settings.camera ? 'Turn Camera Off' : 'Turn Camera On'}
                        >
                            {settings.camera ? <Camera size={20} /> : <CameraOff size={20} />}
                        </button>
                        <button 
                            className={`control-btn ${settings.mic ? 'active' : 'muted'}`}
                            onClick={toggleMic}
                            title={settings.mic ? 'Mute Mic' : 'Unmute Mic'}
                        >
                            {settings.mic ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                        <button 
                            className="control-btn settings"
                            onClick={() => alert('Advanced meeting settings will open here.')}
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
