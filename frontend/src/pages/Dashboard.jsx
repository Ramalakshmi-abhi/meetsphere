import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Video, Plus, Calendar, Settings, LogOut } from 'lucide-react';
import api, { BASE_URL } from '../api';
import { useNavigate } from 'react-router-dom';
import SchedulerModal from '../components/SchedulerModal';
import './Dashboard.css';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [roomID, setRoomID] = React.useState('');
    const [showScheduler, setShowScheduler] = React.useState(false);
    const [meetings, setMeetings] = React.useState([]);

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
            fetch(`${BASE_URL || window.location.origin}/socket.io/?EIO=4&transport=polling`).catch(() => {});
        } catch (e) {}

    }, []);

    const createMeeting = async () => {
        try {
            const res = await api.post('/api/meeting/schedule', {
                title: 'Instant Meeting',
                startTime: new Date().toISOString(),
                participants: []
            });
            navigate(`/room/${res.data.meetingId}`);
        } catch (err) {
            console.error(err);
            // Fallback to random ID if API fails
            const id = Math.random().toString(36).substring(2, 10);
            navigate(`/room/${id}`);
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
            
            {showScheduler && <SchedulerModal closeModal={() => setShowScheduler(false)} />}
        </div>
    );
}
