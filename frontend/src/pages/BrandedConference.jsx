import React from 'react';
import { Layout, Palette, Image as ImageIcon, Type, Save } from 'lucide-react';
import './MenuPages.css';

const BrandedConference = () => {
    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Branded Conference</h1>
                <button className="btn-primary-sm"><Save size={18} /> Save Branding</button>
            </div>

            <div className="branding-grid-layout">
                <div className="branding-controls">
                    <section className="brand-section">
                        <div className="section-title"><Palette size={18} /> Theme Colors</div>
                        <div className="color-pickers">
                            <div className="color-item">
                                <label>Primary Color</label>
                                <div className="color-swatch-wrap">
                                    <div className="swatch" style={{ background: '#6366f1' }}></div>
                                    <input type="text" value="#6366f1" readOnly />
                                </div>
                            </div>
                            <div className="color-item">
                                <label>Secondary Color</label>
                                <div className="color-swatch-wrap">
                                    <div className="swatch" style={{ background: '#1e293b' }}></div>
                                    <input type="text" value="#1e293b" readOnly />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="brand-section">
                        <div className="section-title"><ImageIcon size={18} /> Assets</div>
                        <div className="upload-box">
                            <ImageIcon size={24} />
                            <span>Upload Organization Logo</span>
                            <button className="btn-outline-sm">Select File</button>
                        </div>
                    </section>
                </div>

                <div className="branding-preview">
                    <div className="preview-label">Live Preview</div>
                    <div className="mock-meeting-ui">
                        <div className="mock-header">
                            <div className="mock-logo">
                                <div className="dot" style={{ background: '#6366f1' }}></div>
                                <span>Logo</span>
                            </div>
                            <div className="mock-participants">
                                <div className="part-dot"></div>
                                <div className="part-dot"></div>
                            </div>
                        </div>
                        <div className="mock-video-area">
                            <div className="mock-user-card">
                                <span>John Doe</span>
                            </div>
                        </div>
                        <div className="mock-controls">
                            <div className="c-btn"></div>
                            <div className="c-btn"></div>
                            <div className="c-btn end" style={{ background: '#6366f1' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrandedConference;
