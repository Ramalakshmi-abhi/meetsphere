import React from 'react';
import { Plus } from 'lucide-react';
import api, { BASE_URL, SOCKET_URL } from '../api';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const [roomID, setRoomID] = React.useState('');
    const [meetings, setMeetings] = React.useState([]);
    const [quickMeetingError, setQuickMeetingError] = React.useState('');

    React.useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const res = await api.get('/api/meeting/my-meetings');
                setMeetings(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchMeetings();

        // Silently ping the Socket.io WebSocket server to wake it up in the background
        // since the free tier Railway container goes to sleep after 10m of inactivity
        try {
            fetch(`${SOCKET_URL || BASE_URL || window.location.origin}/socket.io/?EIO=4&transport=polling`).catch(() => {});
        } catch {}

    }, []);

    const createMeeting = async () => {
        setQuickMeetingError('');
        try {
            const res = await api.post('/api/meeting/schedule', {
                title: 'Instant Meeting',
                startTime: new Date().toISOString(),
                participants: []
            });
            navigate(`/room/${res.data.meetingId}`);
        } catch (err) {
            console.error(err);
            setQuickMeetingError(
                err?.response?.data?.error ||
                err?.message ||
                'Unable to create the meeting. Please check that the meeting server is available and try again.'
            );
        }
    };

    const joinMeeting = () => {
        if (roomID.trim()) {
            navigate(`/room/${roomID}`);
        }
    };

    return (
        <div className="dashboard-content">
            <section className="hero">
                <div className="hero-content">
                    <h2>Start a video meeting in seconds</h2>
                    <p>High-quality, secure, and reliable video conferencing for teams.</p>
                    <div className="actions">
                        <button onClick={createMeeting} className="btn-primary"><Plus size={20} /> New Meeting</button>
                        <div className="join-box">
                            <input 
                                type="text" 
                                placeholder="Enter meeting code" 
                                value={roomID}
                                onChange={(e) => setRoomID(e.target.value)}
                            />
                            <button onClick={joinMeeting} className="btn-secondary">Join</button>
                        </div>
                    </div>
                    {quickMeetingError && <p className="hero-error">{quickMeetingError}</p>}
                </div>
            </section>

            <section className="dashboard-sections">
                <div className="stat-card">
                    <h3>Upcoming Meetings</h3>
                    {meetings.length === 0 ? (
                        <div className="empty-state">
                            <p>No meetings scheduled</p>
                            <span>Plan your next session and it will appear here.</span>
                        </div>
                    ) : (
                        <div className="meeting-list">
                            {meetings.map(m => (
                                <div key={m._id} className="meeting-item-row">
                                    <div className="meeting-info">
                                        <strong>{m.title}</strong>
                                        <span>{new Date(m.startTime).toLocaleString()}</span>
                                    </div>
                                    <button onClick={() => navigate(`/room/${m.meetingId}`)} className="btn-small">Join</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="stat-card">
                    <h3>Quick Stats</h3>
                    <div className="stats-grid">
                        <div className="small-stat">
                            <span className="label">Total Meetings</span>
                            <span className="value">{meetings.length}</span>
                        </div>
                        <div className="small-stat">
                            <span className="label">Next Meeting</span>
                            <span className="value">
                                {meetings[0] ? new Date(meetings[0].startTime).toLocaleDateString() : 'None'}
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
