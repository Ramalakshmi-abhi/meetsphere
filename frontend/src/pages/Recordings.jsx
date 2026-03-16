import React from 'react';
import { Play, Download, Trash2, Calendar, Clock, FileVideo } from 'lucide-react';
import './MenuPages.css';

const Recordings = () => {
    const recordings = [
        { id: 1, title: 'Weekly Sync - Engineering', date: 'March 10, 2025', duration: '45m 12s', size: '124 MB' },
        { id: 2, title: 'Product Design Review', date: 'March 08, 2025', duration: '1h 05m', size: '256 MB' },
        { id: 3, title: 'Investor Pitch - Q1', date: 'March 05, 2025', duration: '28m 40s', size: '89 MB' },
        { id: 4, title: 'Sprint Planning', date: 'March 02, 2025', duration: '52m 15s', size: '142 MB' },
    ];

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Recordings</h1>
                <div className="storage-info">
                    <span>Storage: <strong>1.2 GB</strong> of 5 GB used</span>
                    <div className="progress-bar-small"><div className="fill" style={{ width: '24%' }}></div></div>
                </div>
            </div>

            <div className="recordings-grid">
                {recordings.map(rec => (
                    <div key={rec.id} className="recording-card">
                        <div className="video-thumbnail">
                            <Play size={24} fill="white" />
                            <div className="duration-tag">{rec.duration}</div>
                        </div>
                        <div className="recording-details">
                            <h3>{rec.title}</h3>
                            <div className="rec-meta">
                                <span className="meta-item"><Calendar size={14} /> {rec.date}</span>
                                <span className="meta-item"><FileVideo size={14} /> {rec.size}</span>
                            </div>
                            <div className="recording-actions">
                                <button className="btn-icon-text"><Download size={16} /> Download</button>
                                <button className="btn-icon-danger"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Recordings;
