import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Keyboard } from 'lucide-react';
import './MenuPages.css';

const JoinMeeting = () => {
    const [meetingCode, setMeetingCode] = useState('');
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();
        if (meetingCode.trim()) {
            navigate(`/room/${meetingCode}`);
        }
    };

    return (
        <div className="menu-page join-meeting-page">
            <div className="content-card centered">
                <div className="icon-circle large">
                    <Video size={32} />
                </div>
                <h1>Join a Meeting</h1>
                <p>Enter a meeting code or link to join an existing session.</p>
                
                <form onSubmit={handleJoin} className="join-form">
                    <div className="input-with-icon">
                        <Keyboard className="field-icon" size={20} />
                        <input 
                            type="text" 
                            placeholder="Enter code (e.g. abc-def-ghi)" 
                            value={meetingCode}
                            onChange={(e) => setMeetingCode(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-join-large">Join Now</button>
                </form>
                
                <div className="join-footer">
                    <span>Don't have a code? <button onClick={() => navigate('/schedule')}>Schedule a meeting</button></span>
                </div>
            </div>
        </div>
    );
};

export default JoinMeeting;
