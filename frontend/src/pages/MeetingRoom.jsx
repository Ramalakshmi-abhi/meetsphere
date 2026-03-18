import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { BASE_URL } from '../api';
import api from '../api';
import Peer from 'simple-peer';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, MoreVertical, MessageSquare, Users, Circle, X, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatPanel from '../components/ChatPanel';
import './MeetingRoom.css';
import './ParticipantPanel.css';

const WhatsAppIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .003 5.415.001 12.054c0 2.123.555 4.2 1.608 6.037L0 24l6.135-1.61a11.751 11.751 0 005.91 1.583h.005c6.637 0 12.05-5.417 12.052-12.057 0-3.216-1.251-6.241-3.523-8.513"/>
    </svg>
);

const socket = io(BASE_URL, { 
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    secure: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 2000,
    timeout: 20000,
    extraHeaders: {
        'Bypass-Tunnel-Reminder': 'true'
    }
});

export default function MeetingRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const initialState = location.state || {};

    const { user } = useAuth(); // Note: user might be null for guests
    const userName = user?.name || 'Guest';

    
    const [stream, setStream] = useState(null);
    const [peers, setPeers] = useState([]);
    const [micOn, setMicOn] = useState(initialState.mic !== undefined ? initialState.mic : true);
    const [videoOn, setVideoOn] = useState(initialState.camera !== undefined ? initialState.camera : true);
    const [screenStream, setScreenStream] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [recording, setRecording] = useState(false);
    const [meetingTitle, setMeetingTitle] = useState('Meeting');
    const [meetingOptions, setMeetingOptions] = useState({});
    const [showShareModal, setShowShareModal] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [tempGuestName, setTempGuestName] = useState('');
    const [finalName, setFinalName] = useState(userName);

    
    const userVideo = useRef();
    const peersRef = useRef([]);
    const mediaRecorderRef = useRef(null);
    const recordedChunks = useRef([]);

    useEffect(() => {
        if (!hasJoined) {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(currentStream => {
                    // Enforce routing state overrides immediately
                    if (initialState.camera === false && currentStream.getVideoTracks()[0]) {
                        currentStream.getVideoTracks()[0].enabled = false;
                    }
                    if (initialState.mic === false && currentStream.getAudioTracks()[0]) {
                        currentStream.getAudioTracks()[0].enabled = false;
                    }

                    setStream(currentStream);
                    if (userVideo.current) {
                        userVideo.current.srcObject = currentStream;
                    }
                }).catch(err => {
                    console.error("Media error:", err);
                    alert("Camera or Microphone access was denied or not found. Please allow permissions in your browser address bar.");
                });
            } else {
                console.error("navigator.mediaDevices is undefined");
                alert("Camera and Microphone are not supported on this browser context (try using localhost or https).");
            }
            
            // Still fetch details for the waiting room
            const fetchMeetingDetails = async () => {
                try {
                    const res = await api.get(`/api/meeting/${roomId}`);
                    setMeetingTitle(res.data.title);
                    if (res.data.advancedOptions) {
                        setMeetingOptions(res.data.advancedOptions);
                    }
                } catch (err) {
                    console.error('Error fetching meeting details:', err);
                }
            };
            fetchMeetingDetails();
            return;
        }

        // --- Logic for when the user HAS JOINED ---
        console.log("User joining meeting room officially...");
        
        socket.emit('join-room', roomId, socket.id, finalName);

        socket.on('all-users', users => {
            const currentPeers = [];
            users.forEach(userObj => {
                const peer = createPeer(userObj.id, socket.id, stream);
                peersRef.current.push({
                    peerID: userObj.id,
                    peerName: userObj.name,
                    peer,
                });
                currentPeers.push({
                    peerID: userObj.id,
                    peerName: userObj.name,
                    peer,
                });
            });
            setPeers(currentPeers);
        });

        socket.on('user-joined', payload => {
            const peer = addPeer(payload.signal, payload.callerID, stream);
            peersRef.current.push({
                peerID: payload.callerID,
                peerName: payload.callerName,
                peer,
            });
            setPeers(users => [...users, { peerID: payload.callerID, peerName: payload.callerName, peer }]);
        });

        socket.on('receiving-returned-signal', payload => {
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item) {
                item.peerName = payload.name;
                item.peer.signal(payload.signal);
                setPeers(prev => prev.map(p => p.peerID === payload.id ? { ...p, peerName: payload.name } : p));
            }
        });

        socket.on('user-disconnected', userId => {
            const peerObj = peersRef.current.find(p => p.peerID === userId);
            if (peerObj) peerObj.peer.destroy();
            const filteredPeers = peersRef.current.filter(p => p.peerID !== userId);
            peersRef.current = filteredPeers;
            setPeers(filteredPeers);
        });

        return () => {
            socket.disconnect();
        };
    }, [roomId, hasJoined]);

    // Continuously ensure the stream is attached to the local video element,
    // especially after the DOM swaps from the waiting room to the meeting room.
    useEffect(() => {
        if (userVideo.current && stream) {
            userVideo.current.srcObject = stream;
        }
    }, [stream, hasJoined]);

    const joinMeetingRoom = () => {
        if (!user && !tempGuestName.trim()) {
            alert("Please enter your name to join");
            return;
        }
        if (!user) {
            setFinalName(tempGuestName);
        }

        // Enforce Mute on Entry
        if (meetingOptions?.muteOnEntry && stream) {
            stream.getAudioTracks()[0].enabled = false;
            setMicOn(false);
        }

        // Enforce Video Mute on Entry
        if (meetingOptions?.videoMuteOnEntry && stream) {
            stream.getVideoTracks()[0].enabled = false;
            setVideoOn(false);
        }

        setHasJoined(true);
    };


    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    { 
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    { 
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    { 
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ]
            }
        });

        peer.on('signal', signal => {
            socket.emit('sending-signal', { userToSignal, callerID, signal });
        });

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    { 
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    { 
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    { 
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ]
            }
        });

        peer.on('signal', signal => {
            socket.emit('returning-signal', { signal, callerID });
        });

        peer.signal(incomingSignal);

        return peer;
    }

    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
        socket.emit('check-host', roomId);
        socket.on('host-check-result', (result) => {
            setIsHost(result);
        });

        socket.on('mute-action', () => {
            if (stream) {
                stream.getAudioTracks()[0].enabled = false;
                setMicOn(false);
            }
        });

        socket.on('remove-action', () => {
            leaveMeeting();
        });

        return () => {
            socket.off('host-check-result');
            socket.off('mute-action');
            socket.off('remove-action');
        };
    }, [roomId, stream]);

    const muteParticipant = (userID) => {
        socket.emit('mute-user', { userID, roomID: roomId });
    };

    const removeParticipant = (userID) => {
        socket.emit('remove-user', { userID, roomID: roomId });
    };

    const toggleMic = () => {
        if (!stream) {
            alert("Microphone is not available. Please check browser permissions.");
            return;
        }
        stream.getAudioTracks()[0].enabled = !micOn;
        setMicOn(!micOn);
    };

    const toggleVideo = () => {
        if (!stream) {
            alert("Camera is not available. Please check browser permissions.");
            return;
        }
        stream.getVideoTracks()[0].enabled = !videoOn;
        setVideoOn(!videoOn);
    };

    const shareScreen = () => {
        if (!stream || stream.getVideoTracks().length === 0) {
            alert("Your camera must be allowed and active before you can share your screen.");
            return;
        }

        if (!screenStream) {
            navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(screenStream => {
                const screenTrack = screenStream.getVideoTracks()[0];
                
                peersRef.current.forEach(({ peer }) => {
                    peer.replaceTrack(
                        stream.getVideoTracks()[0],
                        screenTrack,
                        stream
                    );
                });

                screenTrack.onended = () => {
                    peersRef.current.forEach(({ peer }) => {
                        peer.replaceTrack(
                            screenTrack,
                            stream.getVideoTracks()[0],
                            stream
                        );
                    });
                    setScreenStream(null);
                };

                setScreenStream(screenStream);
            }).catch(err => {
                console.error("Screen share error:", err);
            });
        } else {
            screenStream.getTracks().forEach(track => track.stop());
            peersRef.current.forEach(({ peer }) => {
                peer.replaceTrack(
                    screenStream.getVideoTracks()[0],
                    stream.getVideoTracks()[0],
                    stream
                );
            });
            setScreenStream(null);
        }
    };

    const toggleRecording = () => {
        if (!stream) {
            alert("You cannot record because your camera and microphone are not connected or allowed.");
            return;
        }
        if (recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        } else {
            recordedChunks.current = [];
            const options = { mimeType: 'video/webm;codecs=vp9,opus' };
            mediaRecorderRef.current = new MediaRecorder(stream, options);
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `meeting-recording-${roomId}.webm`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            };

            mediaRecorderRef.current.start();
            setRecording(true);
        }
    };

    const leaveMeeting = () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
        if (screenStream) screenStream.getTracks().forEach(track => track.stop());
        if (recording) mediaRecorderRef.current.stop();
        navigate('/dashboard');
    };

    const copyToClipboard = () => {
        const url = `${window.location.origin}/room/${roomId}`;
        navigator.clipboard.writeText(url);
        alert('Meeting link copied to clipboard!');
    };

    const shareToWhatsAppRoom = () => {
        const url = `${window.location.origin}/room/${roomId}`;
        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit' };
        
        const dateString = now.toLocaleDateString(undefined, dateOptions);
        const timeString = now.toLocaleTimeString(undefined, timeOptions);
        
        const text = `Join my MeetSphere meeting!\n\n` +
                     `Topic: ${meetingTitle}\n` +
                     `Date: ${dateString}\n` +
                     `Time: ${timeString}\n` +
                     `Location: MeetSphere Web\n\n` +
                     `Meeting ID: ${roomId}\n` +
                     `Link: ${url}`;
                     
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareViaEmail = () => {
        const url = `${window.location.origin}/room/${roomId}`;
        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit' };
        
        const dateString = now.toLocaleDateString(undefined, dateOptions);
        const timeString = now.toLocaleTimeString(undefined, timeOptions);
        
        const subject = `Invitation: Join ${meetingTitle} Video Meeting`;
        const body = `You have been invited to a video meeting on MeetSphere.\n\n` +
                     `Topic: ${meetingTitle}\n` +
                     `Date: ${dateString}\n` +
                     `Time: ${timeString}\n` +
                     `Location: MeetSphere Web\n\n` +
                     `Meeting ID: ${roomId}\n\n` +
                     `Click here to join the meeting: ${url}`;
        
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        // Use a hidden anchor tag which is more reliable on mobile browsers
        const a = document.createElement('a');
        a.href = mailtoLink;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (!hasJoined) {
        return (
            <div className="waiting-room">
                <div className="waiting-room-content">
                    <div className="preview-container">
                        <video playsInline muted ref={userVideo} autoPlay />
                        <div className="preview-controls">
                            <button onClick={toggleMic} className={micOn ? '' : 'off'}>
                                {micOn ? <Mic /> : <MicOff />}
                            </button>
                            <button onClick={toggleVideo} className={videoOn ? '' : 'off'}>
                                {videoOn ? <Video /> : <VideoOff />}
                            </button>
                        </div>
                    </div>
                    <div className="join-options">
                        <h1>{meetingTitle}</h1>
                        <p className="meeting-id">Meeting ID: {roomId}</p>
                        
                        {!user && (
                            <div className="guest-input-group">
                                <label>Enter your name</label>
                                <input 
                                    type="text" 
                                    placeholder="Your Display Name"
                                    value={tempGuestName}
                                    onChange={(e) => setTempGuestName(e.target.value)}
                                />
                            </div>
                        )}
                        
                        {user && (
                            <div className="user-info">
                                <div className="avatar">{userName[0]}</div>
                                <span>Joining as <strong>{userName}</strong></span>
                            </div>
                        )}

                        <button className="join-btn" onClick={joinMeetingRoom}>
                            Join Meeting
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

    return (
        <div className="meeting-container main-layout">
            <div className="meeting-main">
                <div className="video-grid">
                    <div className="video-card self">
                        <video playsInline muted ref={userVideo} autoPlay />
                        {screenStream && <div className="sharing-badge">Sharing Screen</div>}
                        <div className="video-label">You</div>
                    </div>
                    {peers.map((peerObj, index) => (
                        <VideoComponent key={peerObj.peerID} peer={peerObj.peer} />
                    ))}
                </div>
                
                <footer className="meeting-controls">
                    <div className="left-controls">
                        <span className="meeting-title">{meetingTitle}</span>
                        <span className="meeting-id">ID: {roomId}</span>
                    </div>
                    <div className="center-controls">
                        <button onClick={toggleMic} className={micOn ? '' : 'off'}>
                            {micOn ? <Mic /> : <MicOff />}
                        </button>
                        <button onClick={toggleVideo} className={videoOn ? '' : 'off'}>
                            {videoOn ? <Video /> : <VideoOff />}
                        </button>
                        <button onClick={shareScreen} className={screenStream ? 'active' : ''} disabled={meetingOptions?.disableScreenSharing && !isHost} style={{ opacity: (meetingOptions?.disableScreenSharing && !isHost) ? 0.5 : 1, cursor: (meetingOptions?.disableScreenSharing && !isHost) ? 'not-allowed' : 'pointer' }}>
                            <ScreenShare />
                        </button>
                        <button onClick={toggleRecording} className={recording ? 'active recording' : ''}>
                            <Circle size={20} fill={recording ? '#ef4444' : 'none'} />
                        </button>
                        <button onClick={leaveMeeting} className="end-call"><PhoneOff /></button>
                    </div>
                    <div className="right-controls">
                        <button onClick={shareToWhatsAppRoom} title="Share on WhatsApp" className="whatsapp-control-btn">
                            <WhatsAppIcon />
                        </button>
                        <button onClick={() => setShowShareModal(!showShareModal)} className={showShareModal ? 'active' : ''} title="Share Meeting">
                            <Plus size={20} />
                        </button>
                        <button onClick={() => setShowChat(!showChat)} className={showChat ? 'active' : ''}>
                            <MessageSquare />
                        </button>
                        <button onClick={() => setShowParticipants(!showParticipants)} className={showParticipants ? 'active' : ''}>
                            <Users />
                        </button>
                        <button><MoreVertical /></button>
                    </div>
                </footer>
            </div>
            {showShareModal && (
                <div className="share-popover">
                    <h4>Share Meeting</h4>
                    <div className="share-options">
                        <button onClick={copyToClipboard} className="btn-secondary">Copy Link</button>
                        <button onClick={shareViaEmail} className="btn-secondary">✉️ Email Link</button>
                        <button onClick={shareToWhatsAppRoom} className="btn-whatsapp">
                            <WhatsAppIcon /> Share on WhatsApp
                        </button>
                    </div>
                </div>
            )}
            {showParticipants && (
                <div className="participant-panel">
                    <header className="panel-header">
                        <h3>Participants ({peers.length + 1})</h3>
                        <button onClick={() => setShowParticipants(false)}><X size={20} /></button>
                    </header>
                    <div className="participant-list">
                        <div className="participant-item">
                            <div className="avatar small">{userName[0]}</div>
                            <span>{userName} (You)</span>

                        </div>
                        {peers.map(p => (
                            <div key={p.peerID || Math.random()} className="participant-item">
                                <div className="avatar small">{p.peerName ? p.peerName[0].toUpperCase() : 'U'}</div>
                                <span>{p.peerName || (p.peerID ? p.peerID.substring(0, 5) : 'User')}</span>
                                {isHost && (
                                    <div className="host-controls">
                                        <button onClick={() => muteParticipant(p.peerID)} title="Mute">
                                            <MicOff size={16} />
                                        </button>
                                        <button onClick={() => removeParticipant(p.peerID)} title="Remove" className="remove">
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {showChat && (
                <ChatPanel 
                    socket={socket} 
                    roomId={roomId} 
                    user={user || { name: 'Guest', email: '' }} 
                    closeChat={() => setShowChat(false)} 
                />
            )}
        </div>
    );
}

const VideoComponent = ({ peer }) => {
    const ref = useRef();

    useEffect(() => {
        // Handle pre-existing streams explicitly (React race condition fix)
        if (peer.peer.streams && peer.peer.streams.length > 0) {
            ref.current.srcObject = peer.peer.streams[0];
        } else if (peer.peer._remoteStreams && peer.peer._remoteStreams.length > 0) {
            ref.current.srcObject = peer.peer._remoteStreams[0];
        }

        peer.peer.on('stream', stream => {
            ref.current.srcObject = stream;
        });
    }, [peer]);

    return (
        <div className="video-card">
            <video playsInline autoPlay ref={ref} />
            <div className="video-label">{peer.peerName || 'User'}</div>
        </div>
    );
};
