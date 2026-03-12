import React, { useState } from 'react';
import api from '../api';
import { X, Calendar, Clock, Users, Send } from 'lucide-react';
import './SchedulerModal.css';

export default function SchedulerModal({ closeModal }) {
    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('');
    const [participants, setParticipants] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const participantList = participants.split(',').map(p => p.trim()).filter(p => p);
            
            // Convert local time to ISO string to include timezone info
            const isoStartTime = startTime ? new Date(startTime).toISOString() : new Date().toISOString();

            await api.post('/api/meeting/schedule', {
                title: title || 'Scheduled Meeting',
                startTime: isoStartTime,
                participants: participantList
            });
            alert('Meeting scheduled and invitations sent!');
            closeModal();
        } catch (err) {
            console.error(err);
            alert('Failed to schedule meeting');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content auth-card">
                <header>
                    <h3>Schedule Meeting</h3>
                    <button onClick={closeModal} className="close-btn"><X size={20} /></button>
                </header>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <Calendar size={18} />
                        <input 
                            type="text" 
                            placeholder="Meeting Title" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <Clock size={18} />
                        <input 
                            type="datetime-local" 
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <Users size={18} />
                        <textarea 
                            placeholder="Participants Emails (comma separated)" 
                            value={participants}
                            onChange={(e) => setParticipants(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Scheduling...' : <><Send size={18} /> Schedule & Invite</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
