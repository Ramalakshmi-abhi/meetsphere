import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const socket = io(BASE_URL || window.location.origin, { 
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    secure: true
});

export default function MeetingRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // Note: user might be null for guests
    const userName = user?.name || 'Guest';

    
    const [stream, setStream] = useState(null);
    const [peers, setPeers] = useState([]);
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [screenStream, setScreenStream] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [recording, setRecording] = useState(false);
    const [meetingTitle, setMeetingTitle] = useState('Meeting');
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
            // Only get media for preview
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(currentStream => {
                setStream(currentStream);
                if (userVideo.current) {
                    userVideo.current.srcObject = currentStream;
                }
            }).catch(err => console.error("Media error:", err));
            
            // Still fetch details for the waiting room
            const fetchMeetingDetails = async () => {
                try {
                    const res = await api.get(`/api/meeting/${roomId}`);
                    setMeetingTitle(res.data.title);
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
            users.forEach(userId => {
                const peer = createPeer(userId, socket.id, stream);
                peersRef.current.push({
                    peerID: userId,
                    peer,
                });
                currentPeers.push({
                    peerID: userId,
                    peer,
                });
            });
            setPeers(currentPeers);
        });

        socket.on('user-joined', payload => {
            const peer = addPeer(payload.signal, payload.callerID, stream);
            peersRef.current.push({
                peerID: payload.callerID,
                peer,
            });
            setPeers(users => [...users, { peerID: payload.callerID, peer }]);
        });

        socket.on('receiving-returned-signal', payload => {
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item) item.peer.signal(payload.signal);
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

    const joinMeetingRoom = () => {
        if (!user && !tempGuestName.trim()) {
            alert("Please enter your name to join");
            return;
        }
        if (!user) {
            setFinalName(tempGuestName);
        }
        setHasJoined(true);
    };


    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
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
        if (stream) {
            stream.getAudioTracks()[0].enabled = !micOn;
            setMicOn(!micOn);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks()[0].enabled = !videoOn;
            setVideoOn(!videoOn);
        }
    };

    const shareScreen = () => {
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
        const text = `Join my MeetSphere meeting!\n\nID: ${roomId}\nLink: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
                        <button onClick={shareScreen} className={screenStream ? 'active' : ''}>
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
                            <div key={p.peerID} className="participant-item">
                                <div className="avatar small">P</div>
                                <span>{p.peerID.substring(0, 5)}</span>
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
        peer.on('stream', stream => {
            ref.current.srcObject = stream;
        });
    }, [peer]);

    return (
        <div className="video-card">
            <video playsInline autoPlay ref={ref} />
        </div>
    );
};
