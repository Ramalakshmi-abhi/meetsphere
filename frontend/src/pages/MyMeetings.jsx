import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Video, Users, Filter, Trash2 } from 'lucide-react';
import api from '../api';
import './MenuPages.css';

const MyMeetings = () => {
    const [meetings, setMeetings] = useState([]);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const res = await api.get('/api/meeting/my-meetings');
                setMeetings(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchMeetings();
    }, []);

    const handleDelete = async (meetingId) => {
        if (!window.confirm('Are you sure you want to delete this meeting?')) return;
        try {
            await api.delete(`/api/meeting/${meetingId}`);
            setMeetings(prev => prev.filter(m => m._id !== meetingId));
        } catch (err) {
            console.error(err);
            alert('Failed to delete meeting');
        }
    };

    const upcomingMeetings = meetings.filter(m => new Date(m.startTime) >= new Date());
    const pastMeetings = meetings.filter(m => new Date(m.startTime) < new Date());

    const displayMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>My Meetings</h1>
                <div className="header-actions">
                    <button className="icon-btn"><Filter size={18} /></button>
                </div>
            </div>

            <div className="tabs">
                <button 
                    className={`tab-item ${activeTab === 'upcoming' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upcoming')}
                >
                    Upcoming
                </button>
                <button 
                    className={`tab-item ${activeTab === 'past' ? 'active' : ''}`}
                    onClick={() => setActiveTab('past')}
                >
                    Past
                </button>
            </div>

            <div className="meetings-container">
                {loading ? (
                    <div className="loading-state">Loading sessions...</div>
                ) : displayMeetings.length === 0 ? (
                    <div className="empty-state-card">
                        <Calendar size={48} className="empty-icon" />
                        <h3>No {activeTab} meetings found</h3>
                        <p>Your scheduled sessions will appear here.</p>
                        <button className="btn-outline" onClick={() => navigate('/schedule')}>Schedule New</button>
                    </div>
                ) : (
                    <div className="meeting-grid">
                        {displayMeetings.map(m => (
                            <div key={m._id} className="meeting-card-v2">
                                <div className="card-top">
                                    <div className="date-badge">
                                        <span className="month">{new Date(m.startTime).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="day">{new Date(m.startTime).getDate()}</span>
                                    </div>
                                    <div className="meeting-summary">
                                        <h3>{m.title}</h3>
                                        <div className="time-info">
                                            <Clock size={14} /> 
                                            <span>{new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-bottom">
                                    <div className="participants-count">
                                        <Users size={16} />
                                        <span>{m.participants?.length || 0} Invited</span>
                                    </div>
                                    <div className="card-actions-row">
                                        <button 
                                            className="icon-btn"
                                            onClick={() => handleDelete(m._id)}
                                            title="Delete Meeting"
                                            style={{ color: '#ef4444', border: '1px solid #fee2e2', background: '#fef2f2', padding: '0.4rem', borderRadius: '0.4rem' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button 
                                            className="btn-outline-sm"
                                            onClick={() => navigate(`/schedule?edit=${m._id}`)}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            className="btn-primary-sm" 
                                            onClick={() => navigate(`/room/${m.meetingId || m.passcode}`)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            Join <Video size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyMeetings;
