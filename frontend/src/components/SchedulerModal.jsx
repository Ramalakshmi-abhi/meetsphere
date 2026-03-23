import React, { useState } from 'react';
import api from '../api';
import { X, Calendar, Clock, Users, Send } from 'lucide-react';
import './SchedulerModal.css';

const WhatsAppIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .003 5.415.001 12.054c0 2.123.555 4.2 1.608 6.037L0 24l6.135-1.61a11.751 11.751 0 005.91 1.583h.005c6.637 0 12.05-5.417 12.052-12.057 0-3.216-1.251-6.241-3.523-8.513"/>
    </svg>
);

export default function SchedulerModal({ closeModal }) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [participants, setParticipants] = useState('');
    const [loading, setLoading] = useState(false);
    const [advancedOptions, setAdvancedOptions] = useState({
        muteOnEntry: false,
        videoMuteOnEntry: false,
        disableScreenSharing: false,
        enableRecording: true,
        enableLivestream: false
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const participantList = participants.split(',').map(p => p.trim()).filter(p => p);
            
            // Combine date and time and convert to ISO string
            let isoStartTime = new Date().toISOString();
            if (date && time) {
                isoStartTime = new Date(`${date}T${time}`).toISOString();
            } else if (date) {
                isoStartTime = new Date(date).toISOString();
            }

            const res = await api.post('/api/meeting/schedule', {
                title: title || 'Scheduled Meeting',
                startTime: isoStartTime,
                participants: participantList,
                options: advancedOptions
            });
            if (res.data.emailWarnings && res.data.emailWarnings.length > 0) {
                alert('Meeting scheduled, BUT EMAIL FAILED! Error:\n' + res.data.emailWarnings.join('\n'));
            } else {
                alert('Meeting scheduled and invitations sent!');
            }
            closeModal();
        } catch (err) {
            console.error(err);
            alert('Failed to schedule meeting');
        } finally {
            setLoading(false);
        }
    };
    
    const shareToWhatsApp = () => {
        const meetingId = Math.random().toString(36).substring(2, 10);
        const url = `${window.location.origin}/room/${meetingId}`;
        const text = `Join my MeetSphere meeting!\n\nTitle: ${title || 'Scheduled Meeting'}\nDate: ${date}\nTime: ${time}\n\nLink: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
                    <div className="datetime-group">
                        <div className="input-group">
                            <Calendar size={18} />
                            <input 
                                type="date" 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="input-group">
                            <Clock size={18} />
                            <input 
                                type="time" 
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                required 
                            />
                        </div>
                    </div>
                    <div className="input-group">
                        <Users size={18} />
                        <textarea 
                            placeholder="Participants Emails (comma separated)" 
                            value={participants}
                            onChange={(e) => setParticipants(e.target.value)}
                        />
                    </div>
                    
                    <div className="moderator-options" style={{ textAlign: 'left', marginBottom: '1rem', fontSize: '0.9rem', color: '#4b5563' }}>
                        <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.3rem', color: '#1f2937' }}>Moderator Options</h4>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={advancedOptions.enableRecording} onChange={(e) => setAdvancedOptions({...advancedOptions, enableRecording: e.target.checked})} /> Enable Recording
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={advancedOptions.muteOnEntry} onChange={(e) => setAdvancedOptions({...advancedOptions, muteOnEntry: e.target.checked})} /> Mute On Entry
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={advancedOptions.videoMuteOnEntry} onChange={(e) => setAdvancedOptions({...advancedOptions, videoMuteOnEntry: e.target.checked})} /> Video Mute On Entry
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={advancedOptions.enableLivestream} onChange={(e) => setAdvancedOptions({...advancedOptions, enableLivestream: e.target.checked})} /> Enable Livestream
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={advancedOptions.disableScreenSharing} onChange={(e) => setAdvancedOptions({...advancedOptions, disableScreenSharing: e.target.checked})} /> Disable Screen Sharing
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? 'Scheduling...' : <><Send size={18} /> Schedule</>}
                        </button>
                        <button type="button" onClick={shareToWhatsApp} className="auth-btn" style={{ background: '#25D366' }}>
                            <WhatsAppIcon /> WhatsApp
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
