import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Video, Plus, Calendar, Settings, LogOut } from 'lucide-react';
import api from '../api';
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
    }, []);

    const createMeeting = () => {
        const id = Math.random().toString(36).substring(2, 10);
        navigate(`/room/${id}`);
    };

    const joinMeeting = () => {
        if (roomID.trim()) {
            navigate(`/room/${roomID}`);
        }
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="logo">MeetSphere</div>
                <nav>
                    <button className="active"><Video size={20} /> Meetings</button>
                    <button onClick={() => setShowScheduler(true)}><Calendar size={20} /> Schedule</button>
                    <button><Settings size={20} /> Settings</button>
                </nav>
                <button onClick={logout} className="logout-btn">
                    <LogOut size={20} /> Logout
                </button>
            </aside>
            <main className="main-content">
                <header>
                    <h1>Welcome, {user?.name}</h1>
                    <div className="user-profile">
                        <span>{user?.email}</span>
                        <div className="avatar">{user?.name[0]}</div>
                    </div>
                </header>
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
                <section className="stats">
                    <div className="stat-card">
                        <h3>Upcoming Meetings</h3>
                        {meetings.length === 0 ? (
                            <p>No meetings scheduled</p>
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
                        <h3>Meeting History</h3>
                        <p>No previous meetings found</p>
                    </div>
                </section>
                {showScheduler && <SchedulerModal closeModal={() => setShowScheduler(false)} />}
            </main>
        </div>
    );
}
