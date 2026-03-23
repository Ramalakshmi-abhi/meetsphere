import React, { useState, useEffect } from 'react';
import { Users, Video, Database, Activity, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/api/admin/stats');
                setStats(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchStats();
    }, []);

    if (!stats) return <div className="loading">Loading Stats...</div>;

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <button onClick={() => navigate('/dashboard')} className="back-btn"><ArrowLeft /> Back</button>
                <h1>Admin Command Center</h1>
            </header>
            <div className="stats-grid">
                <div className="stat-card premium">
                    <Users size={32} />
                    <div className="stat-info">
                        <h3>Total Users</h3>
                        <p className="large">{stats.totalUsers}</p>
                    </div>
                </div>
                <div className="stat-card premium">
                    <Activity size={32} />
                    <div className="stat-info">
                        <h3>Active Meetings</h3>
                        <p className="large">{stats.activeMeetingsCount}</p>
                    </div>
                </div>
                <div className="stat-card premium">
                    <Video size={32} />
                    <div className="stat-info">
                        <h3>Total Scheduled</h3>
                        <p className="large">{stats.totalMeetings}</p>
                    </div>
                </div>
                <div className="stat-card premium">
                    <Database size={32} />
                    <div className="stat-info">
                        <h3>Storage Usage</h3>
                        <p className="large">{stats.storageUsage}</p>
                    </div>
                </div>
            </div>
            <section className="logs-section">
                <h2>System Logs</h2>
                <div className="logs-container">
                    <div className="log-item">
                        <span className="timestamp">10:45 AM</span>
                        <span className="event">Server: Connection established with MongoDB Atlas</span>
                    </div>
                    <div className="log-item">
                        <span className="timestamp">10:40 AM</span>
                        <span className="event">User: Maduranga logged in successfully</span>
                    </div>
                    <div className="log-item">
                        <span className="timestamp">10:30 AM</span>
                        <span className="event">Meeting: 8xjs92k started by Admin</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
