import React, { useEffect, useState } from 'react';
import { Play, Download, Trash2, Calendar, FileVideo } from 'lucide-react';
import api, { BASE_URL } from '../api';
import './MenuPages.css';

const Recordings = () => {
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecordings = async () => {
            try {
                const res = await api.get('/api/meeting/my-recordings');
                setRecordings(res.data);
            } catch (error) {
                console.error('Error fetching recordings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecordings();
    }, []);

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const handlePlay = (fileUrl) => {
        // Open the video in a new tab for native browser playback
        window.open(`${BASE_URL}${fileUrl}`, '_blank');
    };

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Recordings</h1>
            </div>

            {loading ? (
                <div style={{ padding: '20px', color: '#666' }}>Loading recordings...</div>
            ) : recordings.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666', background: '#f9fafb', borderRadius: '8px' }}>
                    <FileVideo size={48} style={{ opacity: 0.5, marginBottom: '10px' }} />
                    <p>No recordings found.</p>
                    <p style={{ fontSize: '14px', marginTop: '5px' }}>Start a meeting and press 'record' to save your first video.</p>
                </div>
            ) : (
                <div className="recordings-grid">
                    {recordings.map(rec => (
                        <div key={rec._id} className="recording-card">
                            <div className="video-thumbnail" onClick={() => handlePlay(rec.fileUrl)} style={{ cursor: 'pointer' }}>
                                <Play size={32} fill="white" />
                            </div>
                            <div className="recording-details">
                                <h3>Meeting ID: {rec.meetingId}</h3>
                                <div className="rec-meta">
                                    <span className="meta-item"><Calendar size={14} /> {new Date(rec.createdAt).toLocaleDateString()}</span>
                                    <span className="meta-item"><FileVideo size={14} /> {formatBytes(rec.sizeBytes)}</span>
                                </div>
                                <div className="recording-actions">
                                    <button className="btn-icon-text" onClick={() => handlePlay(rec.fileUrl)}>
                                        <Play size={16} /> Play
                                    </button>
                                    <a href={`${BASE_URL}${rec.fileUrl}`} download className="btn-icon-text" style={{ textDecoration: 'none' }}>
                                        <Download size={16} /> Save
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Recordings;
