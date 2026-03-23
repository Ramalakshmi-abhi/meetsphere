import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, Mic, MicOff, Camera, CameraOff, Settings } from 'lucide-react';
import api from '../api';
import { describeMediaError, getMediaTrack, requestMediaStream, requestMediaTrack, stopMediaStream } from '../utils/media';
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
    const streamRef = useRef(null);

    const [loadingHardware, setLoadingHardware] = useState(true);
    const [hardwareError, setHardwareError] = useState(null);

    const getErrorMessage = (err, fallback) => (
        err?.response?.data?.error ||
        err?.message ||
        fallback
    );

    const replacePreviewStream = (nextStream) => {
        if (streamRef.current && streamRef.current !== nextStream) {
            stopMediaStream(streamRef.current);
        }

        streamRef.current = nextStream;
        setStream(nextStream);

        if (videoRef.current) {
            videoRef.current.srcObject = nextStream;
        }
    };

    // Initialize media stream on mount
    useEffect(() => {
        const initMedia = async () => {
            setLoadingHardware(true);
            try {
                const { stream: initialStream, errors } = await requestMediaStream({ video: true, audio: true });
                replacePreviewStream(initialStream);
                setSettings((s) => ({
                    ...s,
                    camera: initialStream.getVideoTracks().length > 0,
                    mic: initialStream.getAudioTracks().length > 0,
                }));
                setHardwareError(describeMediaError({ errors, requestedVideo: true, requestedAudio: true }));
            } catch (err) {
                console.error("Failed to access camera/mic for preview:", err);
                setSettings(s => ({ ...s, camera: false, mic: false }));
                setHardwareError(describeMediaError({ error: err, requestedVideo: true, requestedAudio: true }));
            } finally {
                setLoadingHardware(false);
            }
        };

        initMedia();

        return () => {
            stopMediaStream(streamRef.current);
        };
    }, []);

    const retryMedia = async (requested = { camera: true, mic: true }) => {
        setLoadingHardware(true);
        setHardwareError(null);
        try {
            const { stream: nextStream, errors } = await requestMediaStream({
                video: requested.camera,
                audio: requested.mic,
            });

            replacePreviewStream(nextStream);
            setSettings((s) => ({
                ...s,
                camera: nextStream.getVideoTracks().length > 0,
                mic: nextStream.getAudioTracks().length > 0,
            }));
            setHardwareError(describeMediaError({
                errors,
                requestedVideo: requested.camera,
                requestedAudio: requested.mic,
            }));
        } catch (err) {
            console.error("Retry failed:", err);
            setHardwareError(describeMediaError({
                error: err,
                requestedVideo: requested.camera,
                requestedAudio: requested.mic,
            }));
        } finally {
            setLoadingHardware(false);
        }
    };

    const toggleCamera = async () => {
        if (settings.camera) {
            const videoTrack = getMediaTrack(streamRef.current, 'video');
            if (videoTrack) {
                videoTrack.enabled = false;
            }
            setSettings((s) => ({ ...s, camera: false }));
            return;
        }

        setLoadingHardware(true);
        setHardwareError(null);

        try {
            const existingVideoTrack = getMediaTrack(streamRef.current, 'video');
            if (existingVideoTrack) {
                existingVideoTrack.enabled = true;
                setSettings((s) => ({ ...s, camera: true }));
                return;
            }

            if (!streamRef.current) {
                await retryMedia({ camera: true, mic: settings.mic });
                return;
            }

            const newTrack = await requestMediaTrack('video');
            if (!newTrack) {
                throw new Error('No camera track returned.');
            }

            streamRef.current.addTrack(newTrack);
            if (videoRef.current) {
                videoRef.current.srcObject = streamRef.current;
            }
            setSettings((s) => ({ ...s, camera: true }));
        } catch (err) {
            console.error('Camera enable failed:', err);
            setHardwareError(describeMediaError({ error: err, requestedVideo: true }));
        } finally {
            setLoadingHardware(false);
        }
    };

    const toggleMic = async () => {
        if (settings.mic) {
            const audioTrack = getMediaTrack(streamRef.current, 'audio');
            if (audioTrack) {
                audioTrack.enabled = false;
            }
            setSettings((s) => ({ ...s, mic: false }));
            return;
        }

        setLoadingHardware(true);
        setHardwareError(null);

        try {
            const existingAudioTrack = getMediaTrack(streamRef.current, 'audio');
            if (existingAudioTrack) {
                existingAudioTrack.enabled = true;
                setSettings((s) => ({ ...s, mic: true }));
                return;
            }

            if (!streamRef.current) {
                await retryMedia({ camera: settings.camera, mic: true });
                return;
            }

            const newTrack = await requestMediaTrack('audio');
            if (!newTrack) {
                throw new Error('No microphone track returned.');
            }

            streamRef.current.addTrack(newTrack);
            setSettings((s) => ({ ...s, mic: true }));
        } catch (err) {
            console.error('Microphone enable failed:', err);
            setHardwareError(describeMediaError({ error: err, requestedAudio: true }));
        } finally {
            setLoadingHardware(false);
        }
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

        try {
            // Create meeting in the backend
            const res = await api.post('/api/meeting/schedule', {
                title: 'Instant Meeting',
                startTime: new Date().toISOString(),
                participants: [],
                isLocked: settings.waitingRoom // Enforce Waiting Room setting
            });

            // Stop the local preview tracks only after the meeting exists
            if (streamRef.current) {
                stopMediaStream(streamRef.current);
                streamRef.current = null;
            }
            
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
            alert(getErrorMessage(err, 'Unable to create the meeting right now. Please check that the backend server is running and try again.'));
        } finally {
            setLoading(false);
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
                    {hardwareError && (
                        <div className="hardware-hint">
                            <span>{hardwareError}</span>
                            <button type="button" onClick={() => retryMedia({ camera: true, mic: true })}>
                                Retry Devices
                            </button>
                        </div>
                    )}
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
