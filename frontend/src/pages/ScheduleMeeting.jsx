import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    Clock,
    Lock,
    Globe,
    CheckCircle2,
    X,
} from 'lucide-react';
import api, { getMeetingUrl } from '../api';
import { buildMeetingInvite, openWhatsAppInvite } from '../utils/invite';
import './ScheduleMeeting.css';

const pad = (value) => String(value).padStart(2, '0');

const getDefaultScheduleState = () => {
    const now = new Date();
    const defaultStart = new Date(now.getTime() + 15 * 60 * 1000);

    return {
        date: `${defaultStart.getFullYear()}-${pad(defaultStart.getMonth() + 1)}-${pad(defaultStart.getDate())}`,
        time: `${pad(defaultStart.getHours())}:${pad(defaultStart.getMinutes())}`,
    };
};

const ScheduleMeeting = () => {
    const navigate = useNavigate();
    const defaultSchedule = getDefaultScheduleState();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        passcode: '',
        date: defaultSchedule.date,
        time: defaultSchedule.time,
        durationHr: '1',
        durationMin: '0',
        timezone: '(GMT/UTC+05:30) Mumbai, Delhi, ...',
        recurring: false,
        attendees: '',
        options: {
            enableRecording: true,
            autoStartRecording: false,
            muteOnEntry: false,
            videoMuteOnEntry: false,
            forceMute: false,
            enableLivestream: true,
            enableEmbed: true,
            donorboxVisibility: true,
            clickPledgeConnect: true,
            disableScreenSharing: false
        }
    });

    const [showContactModal, setShowContactModal] = useState(false);
    const [newContactEmail, setNewContactEmail] = useState('');
    const [scheduledMeeting, setScheduledMeeting] = useState(null);

    const WhatsAppIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .003 5.415.001 12.054c0 2.123.555 4.2 1.608 6.037L0 24l6.135-1.61a11.751 11.751 0 005.91 1.583h.005c6.637 0 12.05-5.417 12.052-12.057 0-3.216-1.251-6.241-3.523-8.513"/>
        </svg>
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleOption = (option) => {
        setFormData(prev => ({
            ...prev,
            options: { ...prev.options, [option]: !prev.options[option] }
        }));
    };

    const handleAddContact = (e) => {
        e.preventDefault();
        if (newContactEmail.trim()) {
            setFormData(prev => {
                const existing = prev.attendees.trim();
                const updatedAttendees = existing ? `${existing}, ${newContactEmail.trim()}` : newContactEmail.trim();
                return { ...prev, attendees: updatedAttendees };
            });
            setNewContactEmail('');
            setShowContactModal(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const startTime = new Date(`${formData.date}T${formData.time}`).toISOString();
            const participantList = formData.attendees.split(',').map(p => p.trim()).filter(p => p);

            const res = await api.post('/api/meeting/schedule', {
                title: formData.title || 'Untitled Meeting',
                startTime,
                participants: participantList,
                description: formData.description,
                passcode: formData.passcode,
                options: formData.options
            });

            setScheduledMeeting({
                ...res.data,
                passcode: formData.passcode,
                startTime,
                title: formData.title || 'Untitled Meeting'
            });
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || err.message || 'Unknown error occurred';
            alert(`Failed to schedule meeting: ${typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleShareWhatsApp = () => {
        if (!scheduledMeeting) return;

        const meetingCode = scheduledMeeting.passcode || scheduledMeeting.meetingId;
        const { text } = buildMeetingInvite({
            title: scheduledMeeting.title,
            meetingId: meetingCode,
            passcode: scheduledMeeting.passcode,
            startTime: scheduledMeeting.startTime,
        });

        openWhatsAppInvite(text);
    };

    if (scheduledMeeting) {
        const meetingCode = scheduledMeeting.passcode || scheduledMeeting.meetingId;

        return (
            <div className="schedule-page success-view">
                <div className="success-card">
                    <CheckCircle2 size={64} className="success-icon" color="#10b981" />
                    <h2>Meeting Scheduled Successfully!</h2>
                    <p>Your meeting <strong>{scheduledMeeting.title}</strong> has been created.</p>

                    <div className="meeting-details-box">
                        <div className="detail-row">
                            <span>Meeting ID / Passcode:</span>
                            <strong>{meetingCode}</strong>
                        </div>
                        <div className="detail-row">
                            <span>Join Link:</span>
                            <a href={getMeetingUrl(meetingCode)} target="_blank" rel="noreferrer">
                                {getMeetingUrl(meetingCode)}
                            </a>
                        </div>
                    </div>

                    <div className="success-actions">
                        <button onClick={handleShareWhatsApp} className="btn-whatsapp" style={{ background: '#25D366', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginBottom: '16px' }}>
                            <WhatsAppIcon /> Share Invite on WhatsApp
                        </button>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>Go to Dashboard</button>
                            <button onClick={() => setScheduledMeeting(null)} className="btn-primary" style={{ flex: 1, padding: '12px' }}>Schedule Another</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="schedule-page">
            <h1 className="page-title">Schedule a New Meeting</h1>

            <form onSubmit={handleSubmit} className="schedule-form">
                <div className="form-left">
                    <section className="form-section">
                        <div className="form-group">
                            <label>Meeting Name <span className="required">Required, at least 2 characters</span></label>
                            <input
                                type="text"
                                name="title"
                                placeholder="Meeting Name"
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Meeting Description <span className="optional">Optional</span></label>
                            <textarea
                                name="description"
                                placeholder="Meeting Description"
                                value={formData.description}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Meeting Passcode <span className="required">Required, at least 6 characters</span></label>
                            <div className="input-with-icon">
                                <input
                                    type="text"
                                    name="passcode"
                                    placeholder="Passcode"
                                    value={formData.passcode}
                                    onChange={handleInputChange}
                                    required
                                />
                                <Lock size={18} className="field-icon" />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group half">
                                <label>Meeting Date</label>
                                <div className="input-with-icon">
                                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} />
                                    <Calendar size={18} className="field-icon" />
                                </div>
                            </div>
                            <div className="form-group half">
                                <label>Meeting Time</label>
                                <div className="input-with-icon">
                                    <input type="time" name="time" value={formData.time} onChange={handleInputChange} />
                                    <Clock size={18} className="field-icon" />
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group half">
                                <label>Duration</label>
                                <div className="duration-inputs">
                                    <select name="durationHr" value={formData.durationHr} onChange={handleInputChange}>
                                        {[0, 1, 2, 3, 4, 5].map((h) => <option key={h} value={h}>{h} hr</option>)}
                                    </select>
                                    <select name="durationMin" value={formData.durationMin} onChange={handleInputChange}>
                                        {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m} min</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group half">
                                <label>Time Zone</label>
                                <div className="input-with-icon">
                                    <select name="timezone" value={formData.timezone} onChange={handleInputChange}>
                                        <option value={formData.timezone}>{formData.timezone}</option>
                                    </select>
                                    <Globe size={18} className="field-icon" />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Meeting Attendees</label>
                            <div className="attendee-input">
                                <input
                                    type="text"
                                    name="attendees"
                                    placeholder="Select Attendees (comma-separated emails)"
                                    value={formData.attendees}
                                    onChange={handleInputChange}
                                />
                                <button type="button" className="add-contact-btn" onClick={() => setShowContactModal(true)}>
                                    + Add New Contact
                                </button>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="form-right">
                    <section className="form-section side-section">
                        <div className="section-header">
                            <h3>Recurring Meeting</h3>
                            <button
                                type="button"
                                className={`toggle-switch ${formData.recurring ? 'on' : ''}`}
                                onClick={() => setFormData(prev => ({ ...prev, recurring: !prev.recurring }))}
                            >
                                <div className="switch-knob"></div>
                            </button>
                        </div>

                        <div className="moderator-options">
                            <h4>Moderator Options</h4>
                            <div className="checkbox-list">
                                {Object.entries(formData.options).map(([key, value]) => (
                                    <label key={key} className="checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={value}
                                            onChange={() => handleToggleOption(key)}
                                        />
                                        <span className="checkbox-label">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group mt-large">
                            <label>Set Recording Storage</label>
                            <select defaultValue="Dropbox">
                                <option>Dropbox</option>
                                <option>Local</option>
                                <option>Cloud Storage</option>
                            </select>
                        </div>

                        <button type="submit" className="submit-form-btn" disabled={loading}>
                            {loading ? 'Saving & Sending Emails...' : 'Schedule Meeting'}
                        </button>
                    </section>
                </div>
            </form>

            {showContactModal && (
                <div className="modal-overlay">
                    <div className="modal-content contact-modal">
                        <div className="modal-header">
                            <h3>Add New Contact</h3>
                            <button className="close-btn" onClick={() => setShowContactModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddContact} className="modal-body">
                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    placeholder="participant@example.com"
                                    value={newContactEmail}
                                    onChange={(e) => setNewContactEmail(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowContactModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Add Contact</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleMeeting;
