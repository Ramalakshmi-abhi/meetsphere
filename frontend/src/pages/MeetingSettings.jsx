import React, { useState } from 'react';
import { Shield, Key, Globe, Bell, Smartphone, Monitor } from 'lucide-react';
import './MenuPages.css';

const MeetingSettings = () => {
    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Meeting Settings</h1>
                <button className="btn-primary-sm">Save Changes</button>
            </div>

            <div className="settings-container-v2">
                <section className="settings-section">
                    <div className="section-header">
                        <Monitor size={20} />
                        <h3>Video & Audio</h3>
                    </div>
                    <div className="settings-row">
                        <div className="setting-info">
                            <strong>Default Video Quality</strong>
                            <span>Choose the default resolution for your meetings.</span>
                        </div>
                        <select className="setting-select">
                            <option>High Definition (720p)</option>
                            <option>Full HD (1080p)</option>
                            <option>Standard (480p)</option>
                        </select>
                    </div>
                    <div className="settings-row">
                        <div className="setting-info">
                            <strong>Mute on Entry</strong>
                            <span>Participants will be muted when they join.</span>
                        </div>
                        <input type="checkbox" className="switch" defaultChecked />
                    </div>
                </section>

                <section className="settings-section">
                    <div className="section-header">
                        <Shield size={20} />
                        <h3>Security</h3>
                    </div>
                    <div className="settings-row">
                        <div className="setting-info">
                            <strong>Waiting Room</strong>
                            <span>Guests must be admitted by the host.</span>
                        </div>
                        <input type="checkbox" className="switch" />
                    </div>
                    <div className="settings-row">
                        <div className="setting-info">
                            <strong>Meeting Passcode</strong>
                            <span>Require a passcode for all scheduled meetings.</span>
                        </div>
                        <input type="checkbox" className="switch" defaultChecked />
                    </div>
                </section>
            </div>
        </div>
    );
};

export default MeetingSettings;
