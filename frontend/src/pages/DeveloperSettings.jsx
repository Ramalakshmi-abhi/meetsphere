import React from 'react';
import { Code, Key, Globe, Zap, Copy } from 'lucide-react';
import './MenuPages.css';

const DeveloperSettings = () => {
    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Developer Settings</h1>
                <button className="btn-outline">Documentation</button>
            </div>

            <div className="dev-card-main">
                <div className="dev-card-header">
                    <div className="icon-badge"><Key size={20} /></div>
                    <div className="header-text">
                        <h3>API Credentials</h3>
                        <p>Use these keys to authenticate your requests to the MeetSphere API.</p>
                    </div>
                </div>
                
                <div className="api-key-box">
                    <div className="key-item">
                        <span className="key-label">API Key</span>
                        <div className="key-value-wrap">
                            <input type="password" value="ms_live_49f8a2b3c4d5e6f7g8h9i0j" readOnly />
                            <button className="copy-btn"><Copy size={16} /></button>
                        </div>
                    </div>
                    <div className="key-item">
                        <span className="key-label">Secret Key</span>
                        <div className="key-value-wrap">
                            <input type="password" value="sk_test_9876543210abcdef012345678" readOnly />
                            <button className="copy-btn"><Copy size={16} /></button>
                        </div>
                    </div>
                </div>
                <button className="btn-regenerate">Regenerate Keys</button>
            </div>

            <div className="webhooks-section">
                <h3>Webhooks</h3>
                <div className="empty-webhooks">
                    <Zap size={32} />
                    <p>No webhooks configured yet.</p>
                    <button className="btn-primary-sm">Add Webhook URL</button>
                </div>
            </div>
        </div>
    );
};

export default DeveloperSettings;
