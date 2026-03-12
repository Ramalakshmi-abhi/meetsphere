import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { BASE_URL } from '../api';
import Peer from 'simple-peer';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, MoreVertical, MessageSquare, Users, Circle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatPanel from '../components/ChatPanel';
import './MeetingRoom.css';
import './ParticipantPanel.css';

const socket = io(BASE_URL || window.location.origin, { 
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    secure: true
});

export default function MeetingRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [stream, setStream] = useState(null);
    const [peers, setPeers] = useState([]);
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [screenStream, setScreenStream] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [recording, setRecording] = useState(false);
    
    const userVideo = useRef();
    const peersRef = useRef([]);
    const mediaRecorderRef = useRef(null);
    const recordedChunks = useRef([]);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(currentStream => {
            setStream(currentStream);
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }

            socket.emit('join-room', roomId, socket.id);

            socket.on('all-users', users => {
                const peers = [];
                users.forEach(userId => {
                    const peer = createPeer(userId, socket.id, currentStream);
                    peersRef.current.push({
                        peerID: userId,
                        peer,
                    });
                    peers.push({
                        peerID: userId,
                        peer,
                    });
                });
                setPeers(peers);
            });

            socket.on('user-joined', payload => {
                const peer = addPeer(payload.signal, payload.callerID, currentStream);
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
                const peers = peersRef.current.filter(p => p.peerID !== userId);
                peersRef.current = peers;
                setPeers(peers);
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [roomId]);

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
                        <span className="meeting-id">Meeting ID: {roomId}</span>
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
            {showParticipants && (
                <div className="participant-panel">
                    <header className="panel-header">
                        <h3>Participants ({peers.length + 1})</h3>
                        <button onClick={() => setShowParticipants(false)}><X size={20} /></button>
                    </header>
                    <div className="participant-list">
                        <div className="participant-item">
                            <div className="avatar small">{user.name[0]}</div>
                            <span>{user.name} (You)</span>
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
                    user={user} 
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
