import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ConnectionState, Room, RoomEvent, Track } from 'livekit-client';
import {
    Circle,
    Mic,
    MicOff,
    PhoneOff,
    ScreenShare,
    Users,
    Video,
    VideoOff,
    X,
    MessageSquare,
    UserPlus,
    BarChart2,
    MonitorUp,
    LayoutGrid,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    Mail
} from 'lucide-react';
import io from 'socket.io-client';
import ChatPanel from '../components/ChatPanel';
import api, {
    LIVEKIT_URL,
    SOCKET_URL,
    getAbsoluteUrl,
    getApiErrorMessage,
    withBackendRetry,
} from '../api';
import { useAuth } from '../context/AuthContext';
import './MeetingRoom.css';
import './ParticipantPanel.css';

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

const getParticipantLabel = (participant, fallback = 'Guest') => (
    participant?.name || participant?.identity || fallback
);

const getParticipantInitial = (participant, fallback = 'G') => (
    getParticipantLabel(participant, fallback).trim().charAt(0).toUpperCase() || fallback
);

const getPrimaryVideoPublication = (participant) => (
    participant?.getTrackPublication(Track.Source.ScreenShare)
    || participant?.getTrackPublication(Track.Source.Camera)
    || null
);

const getPrimaryAudioPublication = (participant) => (
    participant?.getTrackPublication(Track.Source.Microphone) || null
);

const getConnectionAccent = (connectionState) => {
    switch (connectionState) {
        case ConnectionState.Connected:
            return '#4ade80';
        case ConnectionState.Connecting:
        case ConnectionState.Reconnecting:
        case ConnectionState.SignalReconnecting:
            return '#fbbf24';
        default:
            return '#f87171';
    }
};

const ParticipantTile = ({ participant, label, isLocal = false, version = 0 }) => {
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    const videoPublication = getPrimaryVideoPublication(participant);
    const audioPublication = isLocal ? null : getPrimaryAudioPublication(participant);
    const videoTrack = videoPublication?.videoTrack;
    const audioTrack = audioPublication?.audioTrack;
    const isScreenShare = videoPublication?.source === Track.Source.ScreenShare;

    useEffect(() => {
        if (!videoRef.current || !videoTrack) {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            return undefined;
        }

        const element = videoRef.current;
        videoTrack.attach(element);
        element.muted = isLocal;
        element.volume = isLocal ? 0 : 1;

        return () => {
            videoTrack.detach(element);
        };
    }, [videoTrack, isLocal, version]);

    useEffect(() => {
        if (!audioRef.current || !audioTrack) {
            if (audioRef.current) {
                audioRef.current.srcObject = null;
            }
            return undefined;
        }

        const element = audioRef.current;
        audioTrack.attach(element);
        element.autoplay = true;

        return () => {
            audioTrack.detach(element);
        };
    }, [audioTrack, version]);

    return (
        <div className={`video-card ${isLocal ? 'self' : ''}`}>
            {videoTrack ? (
                <video playsInline autoPlay muted={isLocal} ref={videoRef} />
            ) : (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.88))',
                        color: '#e2e8f0',
                        fontWeight: 700,
                        fontSize: 'clamp(1.25rem, 2vw, 1.9rem)',
                        letterSpacing: '0.02em',
                    }}
                >
                    {getParticipantInitial(participant)}
                </div>
            )}
            {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
            {isScreenShare && <div className="sharing-badge">Sharing Screen</div>}
            <div className="video-label">{label}</div>
        </div>
    );
};

export default function LiveKitMeetingRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const initialState = location.state || {};

    const [meetingTitle, setMeetingTitle] = useState('Large Room Beta');
    const [hostBranding, setHostBranding] = useState(null);
    const [hasJoined, setHasJoined] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [tempGuestName, setTempGuestName] = useState('');
    const [finalName, setFinalName] = useState(user?.name || 'Guest');
    const [room, setRoom] = useState(null);
    const [remoteParticipants, setRemoteParticipants] = useState([]);
    const [connectionState, setConnectionState] = useState(ConnectionState.Disconnected);
    const [micOn, setMicOn] = useState(initialState.mic !== undefined ? initialState.mic : true);
    const [videoOn, setVideoOn] = useState(initialState.camera !== undefined ? initialState.camera : true);
    const [screenShareOn, setScreenShareOn] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [recording, setRecording] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [logoLoadFailed, setLogoLoadFailed] = useState(false);
    const [localTrackVersion, setLocalTrackVersion] = useState(0);

    const roomRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        socketRef.current = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        if (roomId) {
            socketRef.current.emit('join-room', roomId, user?.id || Date.now());
        }
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [roomId, user?.id]);
    
    const toggleRecording = () => setRecording(!recording);
    const openEmailInviteModal = () => alert('Email invites coming soon!');

    const syncRemoteParticipants = useCallback((activeRoom = roomRef.current) => {
        setRemoteParticipants(activeRoom ? Array.from(activeRoom.remoteParticipants.values()) : []);
    }, []);

    const syncLocalTrackState = useCallback((activeRoom = roomRef.current) => {
        const localParticipant = activeRoom?.localParticipant;
        if (!localParticipant) {
            setMicOn(false);
            setVideoOn(false);
            setScreenShareOn(false);
            setLocalTrackVersion((version) => version + 1);
            return;
        }

        const microphonePublication = localParticipant.getTrackPublication(Track.Source.Microphone);
        const cameraPublication = localParticipant.getTrackPublication(Track.Source.Camera);
        const screenSharePublication = localParticipant.getTrackPublication(Track.Source.ScreenShare);

        setMicOn(Boolean(microphonePublication && !microphonePublication.isMuted));
        setVideoOn(Boolean(cameraPublication && !cameraPublication.isMuted));
        setScreenShareOn(Boolean(screenSharePublication?.track));
        setLocalTrackVersion((version) => version + 1);
    }, []);

    useEffect(() => {
        setLogoLoadFailed(false);
    }, [hostBranding?.logoUrl]);

    useEffect(() => {
        let cancelled = false;

        const fetchMeetingDetails = async () => {
            try {
                const res = await withBackendRetry(
                    () => api.get(`/api/meeting/public/${roomId}`),
                    { warmup: true }
                );

                if (cancelled) {
                    return;
                }

                setMeetingTitle(res.data?.title || 'Large Room Beta');
                if (res.data?.host?.branding) {
                    setHostBranding(res.data.host.branding);
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setJoinError(getApiErrorMessage(error, 'Unable to load meeting details.'));
            }
        };

        fetchMeetingDetails();

        return () => {
            cancelled = true;
        };
    }, [roomId]);

    useEffect(() => {
        const previousTitle = document.title;
        document.title = `${meetingTitle || 'Meeting'} - MeetSphere`;

        return () => {
            document.title = previousTitle;
        };
    }, [meetingTitle]);

    useEffect(() => () => {
        const activeRoom = roomRef.current;
        roomRef.current = null;
        if (activeRoom) {
            activeRoom.disconnect(true).catch(() => {});
        }
    }, []);

    const leaveMeeting = useCallback(async () => {
        const activeRoom = roomRef.current;
        roomRef.current = null;

        if (activeRoom) {
            try {
                await activeRoom.disconnect(true);
            } catch (error) {
                console.error('Failed to disconnect LiveKit room:', error);
            }
        }

        setRoom(null);
        setHasJoined(false);
        setRemoteParticipants([]);
        setConnectionState(ConnectionState.Disconnected);
        setShowParticipants(false);

        navigate(user ? '/dashboard' : '/login');
    }, [navigate, user]);

    const joinMeetingRoom = async () => {
        const requestedName = String(user?.name || tempGuestName || '').trim();
        if (!requestedName) {
            setJoinError('Enter your name before joining the meeting.');
            return;
        }

        setJoinError('');
        setIsJoining(true);

        const nextRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
            stopLocalTrackOnUnpublish: true,
        });

        const updateRemoteParticipants = () => syncRemoteParticipants(nextRoom);
        const updateLocalParticipant = () => syncLocalTrackState(nextRoom);
        const handleConnectionStateChanged = (state) => setConnectionState(state);
        const handleDisconnected = () => {
            setConnectionState(ConnectionState.Disconnected);
            syncRemoteParticipants(null);
        };

        nextRoom.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
        nextRoom.on(RoomEvent.ParticipantConnected, updateRemoteParticipants);
        nextRoom.on(RoomEvent.ParticipantDisconnected, updateRemoteParticipants);
        nextRoom.on(RoomEvent.TrackSubscribed, updateRemoteParticipants);
        nextRoom.on(RoomEvent.TrackUnsubscribed, updateRemoteParticipants);
        nextRoom.on(RoomEvent.TrackPublished, updateRemoteParticipants);
        nextRoom.on(RoomEvent.TrackUnpublished, updateRemoteParticipants);
        nextRoom.on(RoomEvent.LocalTrackPublished, updateLocalParticipant);
        nextRoom.on(RoomEvent.LocalTrackUnpublished, updateLocalParticipant);
        nextRoom.on(RoomEvent.Disconnected, handleDisconnected);

        try {
            const tokenResponse = await withBackendRetry(
                () => api.post(`/api/meeting/public/${roomId}/livekit-token`, {
                    name: requestedName,
                }),
                { warmup: true }
            );

            const liveKitUrl = normalizeLiveKitUrl(tokenResponse.data?.url || LIVEKIT_URL);
            if (!liveKitUrl) {
                throw new Error('LiveKit URL is missing. Set LIVEKIT_URL on the backend or VITE_LIVEKIT_URL on the frontend.');
            }

            setFinalName(requestedName);
            roomRef.current = nextRoom;

            await nextRoom.connect(liveKitUrl, tokenResponse.data.token);

            const mediaWarnings = [];
            if (videoOn) {
                try {
                    await nextRoom.localParticipant.setCameraEnabled(true);
                } catch (error) {
                    mediaWarnings.push('Camera permission was blocked, so you joined without video.');
                    console.error('Camera publish failed:', error);
                }
            }

            if (micOn) {
                try {
                    await nextRoom.localParticipant.setMicrophoneEnabled(true);
                } catch (error) {
                    mediaWarnings.push('Microphone permission was blocked, so you joined muted.');
                    console.error('Microphone publish failed:', error);
                }
            }

            await nextRoom.startAudio().catch(() => {});
            await nextRoom.startVideo().catch(() => {});

            syncRemoteParticipants(nextRoom);
            syncLocalTrackState(nextRoom);
            setRoom(nextRoom);
            setHasJoined(true);

            if (mediaWarnings.length > 0) {
                setJoinError(mediaWarnings.join(' '));
            }
        } catch (error) {
            console.error('LiveKit join failed:', error);
            roomRef.current = null;
            await nextRoom.disconnect(true).catch(() => {});
            setJoinError(getApiErrorMessage(error, 'Unable to join the LiveKit room right now.'));
        } finally {
            setIsJoining(false);
        }
    };

    const toggleMicrophone = async () => {
        if (!roomRef.current) {
            setMicOn((value) => !value);
            return;
        }

        try {
            await roomRef.current.localParticipant.setMicrophoneEnabled(!micOn);
            syncLocalTrackState(roomRef.current);
        } catch (error) {
            console.error('Unable to toggle microphone:', error);
            setJoinError('Microphone permission or device access failed.');
        }
    };

    const toggleCamera = async () => {
        if (!roomRef.current) {
            setVideoOn((value) => !value);
            return;
        }

        try {
            await roomRef.current.localParticipant.setCameraEnabled(!videoOn);
            syncLocalTrackState(roomRef.current);
        } catch (error) {
            console.error('Unable to toggle camera:', error);
            setJoinError('Camera permission or device access failed.');
        }
    };

    const toggleScreenShare = async () => {
        if (!roomRef.current) {
            return;
        }

        try {
            await roomRef.current.localParticipant.setScreenShareEnabled(!screenShareOn);
            syncLocalTrackState(roomRef.current);
        } catch (error) {
            console.error('Unable to toggle screen share:', error);
            setJoinError('Screen sharing could not start on this browser right now.');
        }
    };

    const participantCount = (room ? 1 : 0) + remoteParticipants.length;
    const connectionAccent = getConnectionAccent(connectionState);
    const localParticipant = room?.localParticipant || null;
    const localParticipantLabel = finalName || user?.name || 'You';

    if (!hasJoined) {
        return (
            <div className="waiting-room">
                <div className="waiting-room-content">
                    <div
                        className="preview-container"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.82))',
                            color: '#e2e8f0',
                            textAlign: 'center',
                            padding: '32px',
                        }}
                    >
                        <div className="avatar" style={{ width: '72px', height: '72px', fontSize: '1.8rem' }}>
                            {getParticipantInitial({ name: user?.name || tempGuestName || 'Guest' })}
                        </div>
                        <div>
                            <h2 style={{ marginBottom: '10px' }}>{meetingTitle}</h2>
                            <p style={{ margin: 0, color: '#cbd5f5' }}>
                                LiveKit large-room beta is enabled for this route. Camera and mic publish when you join.
                            </p>
                        </div>
                        <div className="preview-controls">
                            <button onClick={toggleMicrophone} className={micOn ? '' : 'off'}>
                                {micOn ? <Mic /> : <MicOff />}
                            </button>
                            <button onClick={toggleCamera} className={videoOn ? '' : 'off'}>
                                {videoOn ? <Video /> : <VideoOff />}
                            </button>
                        </div>
                    </div>
                    <div className="join-options">
                        <h1>{meetingTitle}</h1>
                        <p className="meeting-id">Meeting ID: {roomId}</p>

                        <div
                            style={{
                                marginTop: '12px',
                                padding: '8px 12px',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(34, 197, 94, 0.12)',
                                border: '1px solid rgba(74, 222, 128, 0.35)',
                                color: '#86efac',
                                fontSize: '0.92rem',
                                fontWeight: 600,
                            }}
                        >
                            <Circle size={12} fill="currentColor" />
                            LiveKit SFU beta
                        </div>

                        {!user && (
                            <div className="guest-input-group">
                                <label>Enter your name</label>
                                <input
                                    type="text"
                                    placeholder="Your Display Name"
                                    value={tempGuestName}
                                    onChange={(event) => setTempGuestName(event.target.value)}
                                />
                            </div>
                        )}

                        {user && (
                            <div className="user-info">
                                <div className="avatar">{getParticipantInitial({ name: user.name }, 'U')}</div>
                                <span>Joining as <strong>{user.name}</strong></span>
                            </div>
                        )}

                        {joinError && (
                            <p
                                style={{
                                    marginTop: '14px',
                                    marginBottom: 0,
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    background: 'rgba(248, 113, 113, 0.12)',
                                    border: '1px solid rgba(248, 113, 113, 0.3)',
                                    color: '#fecaca',
                                    fontSize: '14px',
                                    lineHeight: 1.5,
                                }}
                            >
                                {joinError}
                            </p>
                        )}

                        <button className="join-btn" onClick={joinMeetingRoom} disabled={isJoining}>
                            {isJoining ? 'Joining LiveKit...' : 'Join LiveKit Room'}
                        </button>

                        <div className="waiting-footer">
                            <button onClick={() => navigate('/dashboard')} className="cancel-link">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const containerStyle = hostBranding ? {
        '--primary': hostBranding.primaryColor || '#22c55e',
        '--bg-deep': hostBranding.secondaryColor || '#0f1115',
        '--primary-glow': hostBranding.primaryColor ? `${hostBranding.primaryColor}80` : 'rgba(34, 197, 94, 0.35)',
    } : {};

    return (
        <div className="meeting-container main-layout" style={containerStyle}>
            <div
                style={{
                    position: 'fixed',
                    top: '10px',
                    right: '120px',
                    padding: '6px 10px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: connectionAccent,
                    fontSize: '11px',
                    fontWeight: 'bold',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    border: '1px solid currentColor',
                }}
            >
                <div
                    style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'currentColor',
                    }}
                />
                LiveKit: {String(connectionState || ConnectionState.Disconnected).toUpperCase()}
            </div>

            <div className="meeting-main">
                <div className="video-grid">
                    <ParticipantTile
                        participant={localParticipant}
                        label={`${localParticipantLabel} (You)`}
                        isLocal
                        version={localTrackVersion}
                    />
                    {remoteParticipants.map((participant) => (
                        <ParticipantTile
                            key={participant.identity}
                            participant={participant}
                            label={getParticipantLabel(participant)}
                        />
                    ))}
                    {remoteParticipants.length === 0 && (
                        <div
                            className="video-card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '260px',
                                padding: '24px',
                                textAlign: 'center',
                                color: '#cbd5e1',
                                background: 'rgba(15, 23, 42, 0.75)',
                            }}
                        >
                            Share this meeting link to invite the next participant. The LiveKit room is ready.
                        </div>
                    )}
                </div>

                <div className="gallery-nav left">
                    <button><ChevronLeft size={32} /></button>
                </div>
                <div className="gallery-nav right">
                    <button><ChevronRight size={32} /></button>
                </div>

                <footer className="zoom-bottom-bar">
                    <div className="zoom-left">
                        <button onClick={toggleMicrophone} className={`zoom-btn ${!micOn ? 'danger' : ''}`}>
                            <div className="icon-wrapper">
                                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </div>
                            <span>{micOn ? 'Mute' : 'Unmute'}</span>
                        </button>
                        <button onClick={toggleCamera} className={`zoom-btn ${!videoOn ? 'danger' : ''}`}>
                            <div className="icon-wrapper">
                                {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                            </div>
                            <span>{videoOn ? 'Stop Video' : 'Start Video'}</span>
                        </button>
                    </div>

                    <div className="zoom-center">
                        <button className="zoom-btn" onClick={openEmailInviteModal}>
                            <UserPlus size={22} />
                            <span>Invite</span>
                        </button>
                        <button className="zoom-btn" onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}>
                            <div className="icon-badge-container">
                                <Users size={22} />
                                <div className="badge">{participantCount}</div>
                            </div>
                            <span>Manage Participants</span>
                        </button>
                        <button className="zoom-btn" onClick={() => alert('Polling coming soon!')}>
                            <BarChart2 size={22} />
                            <span>Polling</span>
                        </button>
                        <button className="zoom-btn share-btn" onClick={toggleScreenShare}>
                            <div className="share-icon-wrapper">
                                <MonitorUp size={22} />
                            </div>
                            <span>Share Screen</span>
                        </button>
                        <button className="zoom-btn" onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}>
                            <MessageSquare size={22} />
                            <span>Chat</span>
                        </button>
                        <button className="zoom-btn" onClick={toggleRecording}>
                            <Circle size={22} fill={recording ? '#ef4444' : 'none'} color={recording ? '#ef4444' : 'currentColor'} />
                            <span>Record</span>
                        </button>
                        <button className="zoom-btn" onClick={() => alert('Breakout rooms coming soon!')}>
                            <LayoutGrid size={22} />
                            <span>Breakout Rooms</span>
                        </button>
                        <button className="zoom-btn" onClick={() => setShowMoreMenu(!showMoreMenu)}>
                            <MoreHorizontal size={22} />
                            <span>More</span>
                        </button>
                    </div>

                    <div className="zoom-right">
                        <button className="zoom-end-btn" onClick={leaveMeeting}>
                            End Meeting
                        </button>
                    </div>
                </footer>
            </div>

            {showChat && socketRef.current && (
                <div className="chat-panel" style={{ position: 'absolute', right: 0, top: 0, height: '100%', zIndex: 1000 }}>
                    <ChatPanel 
                        socket={socketRef.current} 
                        roomId={roomId} 
                        user={{ name: localParticipantLabel }} 
                        closeChat={() => setShowChat(false)} 
                    />
                </div>
            )}

            {showParticipants && (
                <div className="participant-panel">
                    <header className="panel-header">
                        <h3>Participants ({participantCount})</h3>
                        <button onClick={() => setShowParticipants(false)}>
                            <X size={20} />
                        </button>
                    </header>
                    <div className="participant-list">
                        <div className="participant-item">
                            <div className="avatar small">{getParticipantInitial({ name: localParticipantLabel }, 'Y')}</div>
                            <span>{localParticipantLabel} (You)</span>
                        </div>
                        {remoteParticipants.map((participant) => (
                            <div key={participant.identity} className="participant-item">
                                <div className="avatar small">{getParticipantInitial(participant)}</div>
                                <span>{getParticipantLabel(participant)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
