import React from 'react';

const PlaceholderPage = ({ title }) => {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{title}</h1>
            <p style={{ color: '#64748b' }}>This feature is coming soon!</p>
            <div style={{ 
                marginTop: '4rem', 
                padding: '4rem', 
                border: '2px dashed #e2e8f0', 
                borderRadius: '1rem',
                fontSize: '1.25rem',
                color: '#cbd5e1'
            }}>
                Component for {title} placeholder
            </div>
        </div>
    );
};

export default PlaceholderPage;
