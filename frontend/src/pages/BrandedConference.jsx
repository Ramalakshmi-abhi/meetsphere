import React, { useState, useEffect, useRef, useContext } from 'react';
import { Palette, Image as ImageIcon, Save } from 'lucide-react';
import api from '../api';
import './MenuPages.css';
import { AuthContext } from '../context/AuthContext';

const BrandedConference = () => {
    const { user, updateUser } = useContext(AuthContext);
    const [branding, setBranding] = useState({
        primaryColor: '#6366f1',
        secondaryColor: '#1e293b',
        logoUrl: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewLogoUrl, setPreviewLogoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Fetch real branding from profile
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/auth/profile');
                if (res.data.branding) {
                    setBranding({
                        primaryColor: res.data.branding.primaryColor || '#6366f1',
                        secondaryColor: res.data.branding.secondaryColor || '#1e293b',
                        logoUrl: res.data.branding.logoUrl || ''
                    });
                    setPreviewLogoUrl(res.data.branding.logoUrl || '');
                }
            } catch (err) {
                console.error('Failed to load branding', err);
            }
        };
        fetchProfile();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewLogoUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Save colors
            const colorsRes = await api.put('/api/auth/branding', {
                primaryColor: branding.primaryColor,
                secondaryColor: branding.secondaryColor
            });

            // Save logo if selected
            if (selectedFile) {
                const formData = new FormData();
                formData.append('logo', selectedFile);
                const locoRes = await api.post('/api/auth/branding/logo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (locoRes.data.user) {
                    setBranding(prev => ({ ...prev, logoUrl: locoRes.data.user.branding.logoUrl }));
                }
            }
            
            alert('Branding successfully saved!');
            if (updateUser && colorsRes.data) {
                updateUser(colorsRes.data);
            }
        } catch (err) {
            console.error('Save error', err);
            alert('Failed to save branding settings.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Branded Conference</h1>
                <button className="btn-primary-sm" onClick={handleSave} disabled={loading}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Branding'}
                </button>
            </div>

            <div className="branding-grid-layout">
                <div className="branding-controls">
                    <section className="brand-section">
                        <div className="section-title"><Palette size={18} /> Theme Colors</div>
                        <div className="color-pickers">
                            <div className="color-item">
                                <label>Primary Color</label>
                                <div className="color-swatch-wrap">
                                    <input 
                                        type="color" 
                                        style={{ width: '30px', height: '30px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                        value={branding.primaryColor} 
                                        onChange={(e) => setBranding({...branding, primaryColor: e.target.value})} 
                                    />
                                    <input 
                                        type="text" 
                                        value={branding.primaryColor} 
                                        onChange={(e) => setBranding({...branding, primaryColor: e.target.value})} 
                                    />
                                </div>
                            </div>
                            <div className="color-item">
                                <label>Secondary Color</label>
                                <div className="color-swatch-wrap">
                                    <input 
                                        type="color" 
                                        style={{ width: '30px', height: '30px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                        value={branding.secondaryColor} 
                                        onChange={(e) => setBranding({...branding, secondaryColor: e.target.value})} 
                                    />
                                    <input 
                                        type="text" 
                                        value={branding.secondaryColor} 
                                        onChange={(e) => setBranding({...branding, secondaryColor: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="brand-section">
                        <div className="section-title"><ImageIcon size={18} /> Assets</div>
                        <div className="upload-box">
                            <ImageIcon size={24} />
                            <span>Upload Organization Logo</span>
                            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                            <button className="btn-outline-sm" onClick={() => fileInputRef.current.click()}>Select File</button>
                            {selectedFile && <div style={{ fontSize: '12px', marginTop: '10px', color: '#6366f1' }}>{selectedFile.name} selected</div>}
                        </div>
                    </section>
                </div>

                <div className="branding-preview">
                    <div className="preview-label">Live Preview</div>
                    <div className="mock-meeting-ui" style={{ background: branding.secondaryColor }}>
                        <div className="mock-header">
                            <div className="mock-logo">
                                {previewLogoUrl ? (
                                    <img src={previewLogoUrl.startsWith('blob:') ? previewLogoUrl : `https://meetsphere-production-6ae4.up.railway.app${previewLogoUrl}`} alt="Logo" style={{ height: '24px', borderRadius: '4px', objectFit: 'contain' }} />
                                ) : (
                                    <div className="dot" style={{ background: branding.primaryColor }}></div>
                                )}
                                <span style={{ marginLeft: previewLogoUrl ? '8px' : '0' }}>Logo</span>
                            </div>
                            <div className="mock-participants">
                                <div className="part-dot"></div>
                                <div className="part-dot"></div>
                            </div>
                        </div>
                        <div className="mock-video-area">
                            <div className="mock-user-card" style={{ border: `2px solid ${branding.primaryColor}` }}>
                                <span>John Doe</span>
                            </div>
                        </div>
                        <div className="mock-controls">
                            <div className="c-btn"></div>
                            <div className="c-btn"></div>
                            <div className="c-btn end" style={{ background: branding.primaryColor }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrandedConference;
