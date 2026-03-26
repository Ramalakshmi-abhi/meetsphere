import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import api, { IS_LOCAL_DEV_HOST, SOCKET_URL, getAbsoluteUrl, getMeetingUrl, withBackendRetry } from '../api';
import Peer from 'simple-peer';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, MoreVertical, MessageSquare, Users, Circle, X, Plus, Mail, UserPlus, BarChart2, MonitorUp, LayoutGrid, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatPanel from '../components/ChatPanel';
import { buildMeetingEmailDraft, buildMeetingInvite, openWhatsAppInvite } from '../utils/invite';
import { describeMediaError, getMediaTrack, requestMediaStream, requestMediaTrack, stopMediaStream } from '../utils/media';
import './MeetingRoom.css';
import './ParticipantPanel.css';

const WhatsAppIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .003 5.415.001 12.054c0 2.123.555 4.2 1.608 6.037L0 24l6.135-1.61a11.751 11.751 0 005.91 1.583h.005c6.637 0 12.05-5.417 12.052-12.057 0-3.216-1.251-6.241-3.523-8.513"/>
    </svg>
);

const attachMediaStream = (element, stream, { muted = false } = {}) => {
    if (!element || !stream) return;

    if (element.srcObject !== stream) {
        element.srcObject = stream;
    }

    element.muted = muted;
    element.volume = muted ? 0 : 1;

    const playPromise = element.play?.();
    if (playPromise?.catch) {
        playPromise.catch((error) => {
            console.warn('Media autoplay was blocked or delayed:', error);
        });
    }
};

const socket = io(IS_LOCAL_DEV_HOST ? undefined : SOCKET_URL, {
    path: '/socket.io',
    transports: IS_LOCAL_DEV_HOST ? ['websocket'] : ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 40,
    reconnectionDelay: 2000,
    timeout: 40000,
    upgrade: !IS_LOCAL_DEV_HOST,
    rememberUpgrade: IS_LOCAL_DEV_HOST,
    withCredentials: !IS_LOCAL_DEV_HOST,
    forceNew: IS_LOCAL_DEV_HOST,
    autoConnect: false,
});

export default function MeetingRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const initialState = location.state || {};

    const { user } = useAuth();
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
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showEmailInviteModal, setShowEmailInviteModal] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [tempGuestName, setTempGuestName] = useState('');
    const [finalName, setFinalName] = useState(userName);
    const [hostBranding, setHostBranding] = useState(null);
    const [socketStatus, setSocketStatus] = useState('connecting');
    const [logoLoadFailed, setLogoLoadFailed] = useState(false);
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteEmailError, setInviteEmailError] = useState('');
    const [sendingInvites, setSendingInvites] = useState(false);
    const [roomLimitMessage, setRoomLimitMessage] = useState('');
    const [showPollingModal, setShowPollingModal] = useState(false);
    const [showBreakoutModal, setShowBreakoutModal] = useState(false);

    const userVideo = useRef();
    const peersRef = useRef([]);
    const mediaRecorderRef = useRef(null);
    const recordedChunks = useRef([]);
    const streamRef = useRef(null);

    const updateLocalStream = (nextStream) => {
        streamRef.current = nextStream;
        setStream(nextStream);
        if (userVideo.current) {
            attachMediaStream(userVideo.current, screenStream || nextStream || null, { muted: true });
        }
    };

    const clearPeers = useCallback(({ resetState = true } = {}) => {
        peersRef.current.forEach(({ peer }) => {
            try {
                peer.destroy();
            } catch (err) {
                console.error('Peer cleanup failed:', err);
            }
        });
        peersRef.current = [];
        if (resetState) {
            setPeers([]);
        }
    }, []);

    const updatePeerEntry = useCallback((peerID, updates) => {
        if (!peerID) {
            return;
        }

        peersRef.current = peersRef.current.map((peerEntry) => (
            peerEntry.peerID === peerID ? { ...peerEntry, ...updates } : peerEntry
        ));

        setPeers((currentPeers) => currentPeers.map((peerEntry) => (
            peerEntry.peerID === peerID ? { ...peerEntry, ...updates } : peerEntry
        )));
    }, []);

    useEffect(() => {
        // Socket lifecycle logging
        const handleConnect = () => {
            console.log('✅ SOCKET.IO CONNECTED! ID:', socket.id);
            setSocketStatus('connected');
        };

        const handleConnectError = (err) => {
            console.error('❌ SOCKET.IO ERROR:', err.message);
            setSocketStatus('error');
        };

        const handleDisconnect = (reason) => {
            console.log('❌ SOCKET.IO DISCONNECTED:', reason);
            setSocketStatus('disconnected');
        };

        const handleRoomFull = (payload) => {
            const message = payload?.message || 'This meeting is full. Please try again later.';
            console.warn('Room join rejected:', payload);
            clearPeers();
            if (userVideo.current?.srcObject) {
                stopMediaStream(userVideo.current.srcObject);
                userVideo.current.srcObject = null;
            }
            if (streamRef.current) {
                stopMediaStream(streamRef.current);
                streamRef.current = null;
            }
            setStream(null);
            setScreenStream(null);
            setHasJoined(false);
            setShowParticipants(false);
            setShowChat(false);
            setSocketStatus('error');
            setRoomLimitMessage(message);
            alert(message);
        };

        // Debug polling packets
        const handlePacket = (p) => {
            if (p.type === 'error') console.log('📦 Socket Packet Error:', p.data);
        };

        socket.on('connect', handleConnect);
        socket.on('connect_error', handleConnectError);
        socket.on('disconnect', handleDisconnect);
        socket.on('room-full', handleRoomFull);
        socket.io.on('packet', handlePacket);

        if (!IS_LOCAL_DEV_HOST) {
            try {
                fetch(`${SOCKET_URL}/socket.io/?EIO=4&transport=polling`, {
                    headers: {
                        'Bypass-Tunnel-Reminder': 'true',
                    },
                }).catch(() => {});
            } catch {
                // Ignore wake-up probe failures; socket.io retries handle recovery.
            }
        }

        if (socket.connected) {
            setSocketStatus('connected');
        } else {
            setSocketStatus('connecting');
            socket.connect();
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('connect_error', handleConnectError);
            socket.off('disconnect', handleDisconnect);
            socket.off('room-full', handleRoomFull);
            socket.io.off('packet', handlePacket);
            socket.disconnect();
        };
    }, [clearPeers]);

    useEffect(() => {
        if (!hasJoined) {
            const fetchMeetingDetails = async () => {
                try {
                    const meetingPath = user
                        ? `/api/meeting/${roomId}`
                        : `/api/meeting/public/${roomId}`;
                    const res = await withBackendRetry(() => api.get(meetingPath), { warmup: true });
                    setMeetingTitle(res.data.title);
                    if (res.data.advancedOptions) {
                        setMeetingOptions(res.data.advancedOptions);
                    }
                    if (res.data.host && res.data.host.branding) {
                        setHostBranding(res.data.host.branding);
                    }
                } catch (err) {
                    console.error('Error fetching meeting details:', err);
                }
            };
            fetchMeetingDetails();
            return;
        }

        console.log("User joining meeting room officially...");

        const joinCurrentRoom = () => {
            if (!socket.connected) {
                return;
            }

            clearPeers();
            console.log('Joining room with active socket...', roomId, socket.id);
            socket.emit('join-room', roomId, socket.id, finalName);
        };

        const handleAllUsers = (users) => {
            console.log('All users received:', users);
            clearPeers();
            const currentPeers = [];
            const seenPeerIds = new Set();
            users.forEach(userObj => {
                if (!userObj?.id || userObj.id === socket.id || seenPeerIds.has(userObj.id)) {
                    return;
                }
                seenPeerIds.add(userObj.id);
                const peer = createPeer(userObj.id, socket.id, streamRef.current);
                const peerEntry = {
                    peerID: userObj.id,
                    peerName: userObj.name,
                    peer,
                    remoteStream: null,
                };
                peersRef.current.push(peerEntry);
                currentPeers.push(peerEntry);
            });
            setPeers(currentPeers);
        };

        const handleUserJoined = (payload) => {
            console.log('User joined signal:', payload);
            if (!payload?.callerID || payload.callerID === socket.id) {
                return;
            }
            const existingPeer = peersRef.current.find(p => p.peerID === payload.callerID);
            if (existingPeer) {
                if (existingPeer.peerName !== payload.callerName) {
                    updatePeerEntry(payload.callerID, { peerName: payload.callerName });
                }
                existingPeer.peer.signal(payload.signal);
            } else {
                const peer = addPeer(payload.callerID, streamRef.current);
                const peerEntry = {
                    peerID: payload.callerID,
                    peerName: payload.callerName,
                    peer,
                    remoteStream: null,
                };
                peersRef.current.push(peerEntry);
                setPeers((users) => [
                    ...users.filter((user) => user.peerID !== payload.callerID),
                    peerEntry,
                ]);
                peer.signal(payload.signal);
            }
        };

        const handleReturnedSignal = (payload) => {
            console.log('Received returned signal:', payload);
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item) {
                if (item.peerName !== payload.name) {
                    item.peerName = payload.name;
                    setPeers(prev => prev.map(p => p.peerID === payload.id ? { ...p, peerName: payload.name } : p));
                }
                item.peer.signal(payload.signal);
            }
        };

        const handleUserDisconnected = (userId) => {
            console.log('User disconnected:', userId);
            const peerObj = peersRef.current.find(p => p.peerID === userId);
            if (peerObj) peerObj.peer.destroy();
            const filteredPeers = peersRef.current.filter(p => p.peerID !== userId);
            peersRef.current = filteredPeers;
            setPeers(filteredPeers);
        };

        socket.on('connect', joinCurrentRoom);
        socket.on('all-users', handleAllUsers);
        socket.on('user-joined', handleUserJoined);
        socket.on('receiving-returned-signal', handleReturnedSignal);
        socket.on('user-disconnected', handleUserDisconnected);

        if (socket.connected) {
            joinCurrentRoom();
        } else {
            socket.connect();
        }

        return () => {
            if (socket.connected) {
                socket.emit('leave-room');
            }
            socket.off('connect', joinCurrentRoom);
            socket.off('all-users', handleAllUsers);
            socket.off('user-joined', handleUserJoined);
            socket.off('receiving-returned-signal', handleReturnedSignal);
            socket.off('user-disconnected', handleUserDisconnected);
            clearPeers({ resetState: false });
        };
    }, [roomId, hasJoined, finalName, user, clearPeers, updatePeerEntry]);

    useEffect(() => {
        if (userVideo.current) {
            if (screenStream) {
                attachMediaStream(userVideo.current, screenStream, { muted: true });
            } else if (stream) {
                attachMediaStream(userVideo.current, stream, { muted: true });
            }
        }
    }, [stream, screenStream, hasJoined]);

    useEffect(() => {
        setLogoLoadFailed(false);
    }, [hostBranding?.logoUrl]);

    useEffect(() => {
        const previousTitle = document.title;
        document.title = `${meetingTitle || 'Meeting'} - MeetSphere`;

        return () => {
            document.title = previousTitle;
        };
    }, [meetingTitle]);

    const joinMeetingRoom = async () => {
        if (!user && !tempGuestName.trim()) {
            alert("Please enter your name to join");
            return;
        }
        setRoomLimitMessage('');
        if (!user) {
            setFinalName(tempGuestName);
        }

        let activeStream = streamRef.current;
        let nextVideoOn = videoOn;
        let nextMicOn = micOn;

        if (!activeStream && (videoOn || micOn)) {
            try {
                const { stream: requestedStream, errors } = await requestMediaStream({
                    video: videoOn,
                    audio: micOn,
                });

                activeStream = requestedStream;
                updateLocalStream(requestedStream);

                nextVideoOn = videoOn && requestedStream.getVideoTracks().length > 0;
                nextMicOn = micOn && requestedStream.getAudioTracks().length > 0;
                setVideoOn(nextVideoOn);
                setMicOn(nextMicOn);

                const message = describeMediaError({
                    errors,
                    requestedVideo: videoOn,
                    requestedAudio: micOn,
                });
                if (message) {
                    alert(message);
                }
            } catch (err) {
                console.error("Media error while joining:", err);
                nextVideoOn = false;
                nextMicOn = false;
                setVideoOn(false);
                setMicOn(false);
                alert(describeMediaError({
                    error: err,
                    requestedVideo: videoOn,
                    requestedAudio: micOn,
                }));
            }
        }

        if (meetingOptions?.muteOnEntry && activeStream) {
            const audioTrack = activeStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = false;
                setMicOn(false);
                nextMicOn = false;
            }
        }

        if (meetingOptions?.videoMuteOnEntry && activeStream) {
            const videoTrack = activeStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = false;
                setVideoOn(false);
                nextVideoOn = false;
            }
        }

        if (activeStream) {
            const audioTrack = activeStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = nextMicOn;
            }

            const videoTrack = activeStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = nextVideoOn;
            }
        }

        setHasJoined(true);
    };

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: true,
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                ],
                iceTransportPolicy: 'all'
            }
        });

        peer.on('signal', signal => {
            console.log('SIGNAL emitted to', userToSignal, ':', signal.type || 'candidate');
            socket.emit('sending-signal', { userToSignal, callerID, signal });
        });

        peer.on('connect', () => {
            console.log('PEER CONNECTED SUCCESSFULLY to', userToSignal);
        });

        peer.on('stream', (remoteStream) => {
            console.log('Received remote STREAM from', userToSignal);
            updatePeerEntry(userToSignal, { remoteStream });
        });

        peer.on('iceStateChange', state => {
            console.log('ICE state for', userToSignal, ':', state);
        });

        peer.on('error', err => {
            console.error('Peer error for', userToSignal, ':', err);
        });

        return peer;
    }

    function addPeer(callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: true,
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                ],
                iceTransportPolicy: 'all'
            }
        });

        peer.on('signal', signal => {
            console.log('SIGNAL returned (answer/candidate) to', callerID);
            socket.emit('returning-signal', { signal, callerID });
        });

        peer.on('connect', () => {
            console.log('PEER CONNECTED SUCCESSFULLY from incoming', callerID);
        });

        peer.on('stream', (remoteStream) => {
            console.log('Received remote STREAM from incoming', callerID);
            updatePeerEntry(callerID, { remoteStream });
        });

        peer.on('iceStateChange', state => {
            console.log('ICE state for incoming', callerID, ':', state);
        });

        peer.on('error', err => {
            console.error('Peer error for incoming', callerID, ':', err);
        });

        return peer;
    }

    const leaveMeeting = useCallback(() => {
        if (socket.connected) {
            socket.emit('leave-room');
        }
        if (userVideo.current?.srcObject) {
            stopMediaStream(userVideo.current.srcObject);
            userVideo.current.srcObject = null;
        }
        if (streamRef.current) {
            stopMediaStream(streamRef.current);
            streamRef.current = null;
        }
        if (screenStream) {
            stopMediaStream(screenStream);
        }
        clearPeers();
        if (recording) mediaRecorderRef.current.stop();
        setStream(null);
        setScreenStream(null);
        navigate('/dashboard');
    }, [clearPeers, navigate, recording, screenStream]);

    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
        if (!hasJoined) {
            return undefined;
        }

        socket.emit('check-host', roomId);
        socket.on('host-check-result', (result) => {
            setIsHost(result);
        });

        socket.on('mute-action', () => {
            if (streamRef.current) {
                const audioTrack = streamRef.current.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = false;
                    setMicOn(false);
                }
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
    }, [roomId, hasJoined, leaveMeeting]);

    const muteParticipant = (userID) => {
        socket.emit('mute-user', { userID, roomID: roomId });
    };
 
    const removeParticipant = (userID) => {
        socket.emit('remove-user', { userID, roomID: roomId });
    };

    const toggleMic = async () => {
        const audioTrack = getMediaTrack(streamRef.current, 'audio');
        if (audioTrack) {
            audioTrack.enabled = !micOn;
            setMicOn(!micOn);
            return;
        }

        try {
            const newTrack = await requestMediaTrack('audio');
            if (!newTrack) {
                throw new Error('No microphone track returned.');
            }

            const targetStream = streamRef.current || new MediaStream();
            targetStream.addTrack(newTrack);
            if (!streamRef.current) {
                updateLocalStream(targetStream);
            }

            peersRef.current.forEach(({ peer }) => {
                try {
                    peer.addTrack(newTrack, targetStream);
                } catch (err) {
                    console.error('Failed to add microphone track to peer:', err);
                }
            });

            setMicOn(true);
        } catch (err) {
            console.error('Microphone enable failed:', err);
            alert(describeMediaError({ error: err, requestedAudio: true }));
        }
    };

    const toggleVideo = async () => {
        const videoTrack = getMediaTrack(streamRef.current, 'video');
        if (videoTrack) {
            videoTrack.enabled = !videoOn;
            setVideoOn(!videoOn);
            return;
        }

        try {
            const newTrack = await requestMediaTrack('video');
            if (!newTrack) {
                throw new Error('No camera track returned.');
            }

            const targetStream = streamRef.current || new MediaStream();
            targetStream.addTrack(newTrack);
            if (!streamRef.current) {
                updateLocalStream(targetStream);
            } else if (userVideo.current && !screenStream) {
                attachMediaStream(userVideo.current, targetStream, { muted: true });
            }

            peersRef.current.forEach(({ peer }) => {
                try {
                    peer.addTrack(newTrack, targetStream);
                } catch (err) {
                    console.error('Failed to add camera track to peer:', err);
                }
            });

            setVideoOn(true);
        } catch (err) {
            console.error('Camera enable failed:', err);
            alert(describeMediaError({ error: err, requestedVideo: true }));
        }
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

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
                
                console.log('Uploading recording to server...');
                
                const formData = new FormData();
                formData.append('recording', blob, `meeting-${roomId}.webm`);

                try {
                    await api.post(`/api/meeting/${roomId}/recording`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    alert('Recording successfully saved to the cloud!');
                } catch (error) {
                    console.error('Failed to upload recording:', error);
                    alert('Failed to save to cloud. Downloading locally instead.');
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `meeting-recording-${roomId}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                }
            };

            mediaRecorderRef.current.start();
            setRecording(true);
        }
    };

    const copyToClipboard = () => {
        const url = getMeetingUrl(roomId);
        const closeMenus = () => {
            setShowShareModal(false);
            setShowMoreMenu(false);
        };

        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => {
                    closeMenus();
                    alert('Meeting link copied to clipboard!');
                })
                .catch((error) => {
                    console.error('Clipboard copy failed:', error);
                    alert('Unable to copy the meeting link. Please copy it manually.');
                });
            return;
        }

        closeMenus();
        alert(`Copy this meeting link:\n${url}`);
    };

    const shareToWhatsAppRoom = () => {
        const { text } = buildMeetingInvite({
            title: meetingTitle,
            meetingId: roomId,
        });

        setShowShareModal(false);
        setShowMoreMenu(false);
        openWhatsAppInvite(text);
    };

    const openEmailInviteModal = () => {
        setInviteEmailError('');
        setShowShareModal(false);
        setShowMoreMenu(false);
        setShowEmailInviteModal(true);
    };

    const shareViaEmail = () => {
        const { subject, body } = buildMeetingEmailDraft({
            title: meetingTitle,
            meetingId: roomId,
        });
        
        const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const link = document.createElement('a');
        link.href = mailto;
        link.target = '_blank';
        link.click();
    };

    const sendInviteEmails = async () => {
        const recipients = inviteEmails
            .split(',')
            .map((email) => email.trim())
            .filter(Boolean);

        if (recipients.length === 0) {
            setInviteEmailError('Add at least one recipient email address.');
            return;
        }

        setSendingInvites(true);
        setInviteEmailError('');

        try {
            const res = await api.post(`/api/meeting/${roomId}/invite`, {
                emails: recipients
            });

            const warnings = Array.isArray(res.data.emailWarnings) ? res.data.emailWarnings : [];
            if (warnings.length > 0) {
                alert(`${res.data.message}\n\n${warnings.join('\n')}`);
            } else {
                alert(res.data.message || 'Meeting invitations sent successfully.');
            }

            setInviteEmails('');
            setShowEmailInviteModal(false);
        } catch (err) {
            console.error('Failed to send invite emails:', err);
            if (err?.response?.status === 404) {
                setInviteEmailError('Invite sending is not available on the current backend yet. Restart the backend server and try again.');
            } else {
                setInviteEmailError(
                    err?.response?.data?.error ||
                    err?.message ||
                    'Unable to send meeting invitations right now.'
                );
            }
        } finally {
            setSendingInvites(false);
        }
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
                        
                {/* Socket Status Banner */}
                <div style={{
                    position: 'fixed',
                    top: '10px',
                    right: '10px',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: socketStatus === 'connected' ? '#4ade80' : 
                           socketStatus === 'connecting' ? '#fbbf24' : '#f87171',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid currentColor'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'currentColor',
                        boxShadow: '0 0 8px currentColor'
                    }}></div>
                    Socket: {socketStatus.toUpperCase()}
                </div>

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

                        {roomLimitMessage && (
                            <p style={{
                                marginTop: '14px',
                                marginBottom: '0',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(248, 113, 113, 0.35)',
                                color: '#fca5a5',
                                fontSize: '14px',
                                lineHeight: 1.5,
                            }}>
                                {roomLimitMessage}
                            </p>
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

    const containerStyle = hostBranding ? {
        '--primary': hostBranding.primaryColor || '#6366f1',
        '--bg-deep': hostBranding.secondaryColor || '#0f1115',
        '--primary-glow': hostBranding.primaryColor ? `${hostBranding.primaryColor}80` : 'rgba(99, 102, 241, 0.4)'
    } : {};

    return (
        <div className="meeting-container main-layout" style={containerStyle}>
            {/* Socket Status Banner */}
            <div style={{
                position: 'fixed',
                top: '10px',
                right: '120px', // Shift left in meeting room to avoid overlap with other icons if any
                padding: '6px 10px',
                borderRadius: '20px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: socketStatus === 'connected' ? '#4ade80' : 
                       socketStatus === 'connecting' ? '#fbbf24' : '#f87171',
                fontSize: '11px',
                fontWeight: 'bold',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                border: '1px solid currentColor'
            }}>
                <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'currentColor'
                }}></div>
                Socket: {socketStatus.toUpperCase()}
            </div>
            <div className="meeting-main">
                <div className="video-grid">
                    <div className="video-card self">
                        <video playsInline muted ref={userVideo} autoPlay />
                        {screenStream && <div className="sharing-badge">Sharing Screen</div>}
                        <div className="video-label">You</div>
                    </div>
                    {peers.map((peerObj) => (
                        <VideoComponent
                            key={peerObj.peerID}
                            peerName={peerObj.peerName}
                            remoteStream={peerObj.remoteStream}
                        />
                    ))}
                </div>

                <div className="gallery-nav left">
                    <button><ChevronLeft size={32} /></button>
                </div>
                <div className="gallery-nav right">
                    <button><ChevronRight size={32} /></button>
                </div>
                
                <footer className="zoom-bottom-bar">
                    <div className="zoom-left">
                        <button onClick={toggleMic} className={`zoom-btn ${!micOn ? 'danger' : ''}`}>
                            <div className="icon-wrapper">
                                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </div>
                            <span>{micOn ? 'Mute' : 'Unmute'}</span>
                        </button>
                        <button onClick={toggleVideo} className={`zoom-btn ${!videoOn ? 'danger' : ''}`}>
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
                        <button className="zoom-btn" onClick={() => setShowParticipants(!showParticipants)}>
                            <div className="icon-badge-container">
                                <Users size={22} />
                                <div className="badge">{peers.length + 1}</div>
                            </div>
                            <span>Manage Participants</span>
                        </button>
                        <button className="zoom-btn" onClick={() => setShowPollingModal(true)}>
                            <BarChart2 size={22} />
                            <span>Polling</span>
                        </button>
                        <button className="zoom-btn share-btn" onClick={shareScreen}>
                            <div className="share-icon-wrapper">
                                <MonitorUp size={22} />
                            </div>
                            <span>Share Screen</span>
                        </button>
                        <button className="zoom-btn" onClick={() => setShowChat(!showChat)}>
                            <MessageSquare size={22} />
                            <span>Chat</span>
                        </button>
                        <button className="zoom-btn" onClick={toggleRecording}>
                            <Circle size={22} fill={recording ? '#ef4444' : 'none'} color={recording ? '#ef4444' : 'currentColor'} />
                            <span>Record</span>
                        </button>
                        <button className="zoom-btn" onClick={() => setShowBreakoutModal(true)}>
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
            {showShareModal && (
                <div className="share-popover">
                    <h4>Share Meeting</h4>
                    <div className="share-options">
                        <button onClick={copyToClipboard} className="btn-secondary">Copy Link</button>
                        <button onClick={openEmailInviteModal} className="btn-secondary">Email Invite</button>
                        <button onClick={shareToWhatsAppRoom} className="btn-whatsapp">
                            <WhatsAppIcon /> Share on WhatsApp
                        </button>
                    </div>
                </div>
            )}
            {showMoreMenu && (
                <div className="more-popover">
                    <h4>Meeting Options</h4>
                    <div className="more-options">
                        <button onClick={copyToClipboard} className="btn-secondary">Copy Invite Link</button>
                        <button onClick={openEmailInviteModal} className="btn-secondary">Email Invite</button>
                        <button onClick={() => { setShowParticipants(true); setShowMoreMenu(false); }} className="btn-secondary">View Participants</button>
                        <button onClick={() => { setShowChat(true); setShowMoreMenu(false); }} className="btn-secondary">Open Chat</button>
                    </div>
                </div>
            )}
            {showEmailInviteModal && (
                <div className="meeting-modal-overlay" onClick={() => !sendingInvites && setShowEmailInviteModal(false)}>
                    <div className="meeting-modal email-invite-modal" onClick={(e) => e.stopPropagation()}>
                        <header className="modal-header">
                            <h3>Email Invite</h3>
                            <button className="close-modal" onClick={() => !sendingInvites && setShowEmailInviteModal(false)}>
                                <X size={20} />
                            </button>
                        </header>
                        <div className="modal-body">
                            <p className="modal-subtitle">Send this quick meeting to one or more participants.</p>
                            
                            <div className="form-group">
                                <label>To</label>
                                <textarea 
                                    className="invite-textarea"
                                    placeholder="teammate@company.com, guest@example.com"
                                    value={inviteEmails}
                                    onChange={(e) => setInviteEmails(e.target.value)}
                                    disabled={sendingInvites}
                                />
                                <span className="form-hint">Example: teammate@company.com, guest@example.com</span>
                            </div>

                            {inviteEmailError && <p className="modal-error-text">{inviteEmailError}</p>}

                            <div className="invite-social-options">
                                <button className="whatsapp-option-btn" onClick={shareToWhatsAppRoom}>
                                    <WhatsAppIcon />
                                    <span>Share via WhatsApp</span>
                                </button>
                            </div>
                        </div>
                        <footer className="modal-footer">
                            <button className="outline-btn" onClick={shareViaEmail} disabled={sendingInvites}>
                                <Mail size={18} />
                                Open Mail App
                            </button>
                            <button 
                                className="primary-btn-modal" 
                                onClick={sendInviteEmails}
                                disabled={sendingInvites}
                            >
                                {sendingInvites ? 'Sending...' : 'Send Invite'}
                            </button>
                        </footer>
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

const VideoComponent = ({ peerName, remoteStream }) => {
    const ref = useRef();

    useEffect(() => {
        if (!ref.current) {
            return undefined;
        }

        if (remoteStream) {
            console.log('Attaching remote stream to participant tile');
            attachMediaStream(ref.current, remoteStream);
        } else {
            ref.current.srcObject = null;
        }

        return () => {
            if (ref.current) {
                ref.current.srcObject = null;
            }
        };
    }, [remoteStream]);

    return (
        <div className="video-card">
            <video playsInline autoPlay ref={ref} />
            <div className="video-label">{peerName || 'User'}</div>
        </div>
    );
}

;
