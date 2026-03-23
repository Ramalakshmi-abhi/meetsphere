import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Zap, Copy, Trash2 } from 'lucide-react';
import api from '../api';
import './MenuPages.css';

const DeveloperSettings = () => {
    const navigate = useNavigate();
    const [apiKey, setApiKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [showWebhookInput, setShowWebhookInput] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            if (!localStorage.getItem('token')) return;
            const response = await api.get('/api/auth/profile');
            if (response.data.developerSettings) {
                setApiKey(response.data.developerSettings.apiKey || '');
                setSecretKey(response.data.developerSettings.secretKey || '');
                setWebhooks(response.data.developerSettings.webhooks || []);
            }
        } catch (error) {
            console.error('Error fetching developer settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handleCopy = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        showMessage('Copied to clipboard!');
    };

    const handleRegenerateKeys = async () => {
        const confirmed = window.confirm("Are you sure? This will invalidate any old keys currently in use.");
        if (!confirmed) return;
        
        setRegenerating(true);
        try {
            const response = await api.post('/api/auth/developer/keys', {});
            setApiKey(response.data.apiKey);
            setSecretKey(response.data.secretKey);
            showMessage('Keys regenerated successfully!');
        } catch (error) {
            console.error('Error regenerating keys:', error);
            showMessage('Failed to regenerate keys.', 'error');
        } finally {
            setRegenerating(false);
        }
    };

    const handleAddWebhook = async () => {
        if (!newWebhookUrl) return;
        try {
            const response = await api.post('/api/auth/developer/webhooks', { url: newWebhookUrl });
            setWebhooks(response.data);
            setNewWebhookUrl('');
            setShowWebhookInput(false);
            showMessage('Webhook added successfully!');
        } catch (error) {
            console.error('Error adding webhook:', error);
            showMessage('Failed to add webhook.', 'error');
        }
    };

    const handleDeleteWebhook = async (id) => {
        try {
            const response = await api.delete(`/api/auth/developer/webhooks/${id}`);
            setWebhooks(response.data);
            showMessage('Webhook removed successfully!');
        } catch (error) {
            console.error('Error deleting webhook:', error);
            showMessage('Failed to delete webhook.', 'error');
        }
    };

    if (loading) {
        return <div className="menu-page"><div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div></div>;
    }

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Developer Settings</h1>
                <button className="btn-outline" onClick={() => navigate('/developers/docs')}>Documentation</button>
            </div>

            {message.text && (
                <div style={{
                    padding: '10px 15px', 
                    marginBottom: '20px', 
                    borderRadius: '6px',
                    backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: message.type === 'success' ? '#065f46' : '#991b1b',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    {message.text}
                </div>
            )}

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
                            <input 
                                type="text" 
                                value={apiKey || 'Not generated yet'} 
                                readOnly 
                            />
                            <button className="copy-btn" onClick={() => handleCopy(apiKey)} disabled={!apiKey} title="Copy API Key"><Copy size={16} /></button>
                        </div>
                    </div>
                    <div className="key-item">
                        <span className="key-label">Secret Key</span>
                        <div className="key-value-wrap">
                            <input 
                                type={secretKey ? "password" : "text"} 
                                value={secretKey || 'Not generated yet'} 
                                readOnly 
                            />
                            <button className="copy-btn" onClick={() => handleCopy(secretKey)} disabled={!secretKey} title="Copy Secret Key"><Copy size={16} /></button>
                        </div>
                    </div>
                </div>
                <button 
                    className="btn-regenerate" 
                    onClick={handleRegenerateKeys}
                    disabled={regenerating}
                >
                    {regenerating ? 'Regenerating...' : 'Regenerate Keys'}
                </button>
            </div>

            <div className="webhooks-section">
                <h3>Webhooks</h3>
                
                {webhooks.length === 0 ? (
                    <div className="empty-webhooks">
                        <Zap size={32} />
                        <p>No webhooks configured yet.</p>
                        {!showWebhookInput && (
                            <button className="btn-primary-sm" onClick={() => setShowWebhookInput(true)}>Add Webhook URL</button>
                        )}
                    </div>
                ) : (
                    <div style={{ marginBottom: '20px' }}>
                        {webhooks.map((wh) => (
                            <div key={wh.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#334155', wordBreak: 'break-all', paddingRight: '10px' }}>{wh.url}</span>
                                <button 
                                    onClick={() => handleDeleteWebhook(wh.id)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    title="Delete webhook"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {showWebhookInput || webhooks.length > 0 ? (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input 
                            type="url" 
                            placeholder="https://your-domain.com/webhook" 
                            value={newWebhookUrl}
                            onChange={(e) => setNewWebhookUrl(e.target.value)}
                            style={{ flex: 1, minWidth: '250px', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                        />
                        <button className="btn-primary-sm" onClick={handleAddWebhook}>Save Webhook</button>
                        {showWebhookInput && webhooks.length === 0 && (
                            <button className="btn-outline" onClick={() => setShowWebhookInput(false)}>Cancel</button>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default DeveloperSettings;
