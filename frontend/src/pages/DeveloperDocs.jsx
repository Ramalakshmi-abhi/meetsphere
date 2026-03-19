import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Code, Zap } from 'lucide-react';
import './MenuPages.css';

const DeveloperDocs = () => {
    const navigate = useNavigate();

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Developer Documentation</h1>
                <button className="btn-outline" onClick={() => navigate('/developers')} style={{ display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                    Back to Settings
                </button>
            </div>

            <div className="dev-card-main" style={{ marginBottom: '20px' }}>
                <div className="dev-card-header">
                    <div className="icon-badge"><Code size={20} /></div>
                    <div className="header-text">
                        <h3>API Authentication</h3>
                        <p>Learn how to authenticate your requests to the MeetSphere API.</p>
                    </div>
                </div>
                <div style={{ padding: '0 20px 20px', color: '#475569', lineHeight: '1.6' }}>
                    <p>All API requests must be authenticated using your unique <strong>API Key</strong> and <strong>Secret Key</strong>. You must include these keys in the headers of your HTTP requests to authorize actions like scheduling meetings programmatically.</p>
                    <pre style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', overflowX: 'auto', marginTop: '15px', fontSize: '13px', border: '1px solid #e2e8f0' }}>
{`// Example Axios Request (Node.js/React)
const axios = require('axios');

axios.get('https://meetsphere-api.com/v1/meetings', {
  headers: {
    'x-api-key': 'ms_live_YOUR_API_KEY',
    'x-secret-key': 'sk_live_YOUR_SECRET_KEY'
  }
})
.then(response => {
  console.log("Success!", response.data);
})
.catch(err => console.error(err));`}
                    </pre>
                </div>
            </div>

            <div className="dev-card-main">
                <div className="dev-card-header">
                    <div className="icon-badge"><Zap size={20} /></div>
                    <div className="header-text">
                        <h3>Webhooks Guide</h3>
                        <p>Listen for real-time events on your own server automatically.</p>
                    </div>
                </div>
                <div style={{ padding: '0 20px 20px', color: '#475569', lineHeight: '1.6' }}>
                    <p>Webhooks allow you to receive HTTP POST requests whenever an event happens in MeetSphere (like a meeting starting or ending). Create a public URL on your backend server and register it in the Developer Settings.</p>
                    <pre style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', overflowX: 'auto', marginTop: '15px', fontSize: '13px', border: '1px solid #e2e8f0' }}>
{`// Example Express.js Webhook Listener
const express = require('express');
const app = express();

// Middleware to parse incoming JSON
app.use(express.json());

app.post('/webhook/meetsphere', (req, res) => {
  const event = req.body;
  
  if (event.type === 'meeting.started') {
    console.log('A meeting started with ID:', event.data.meetingId);
    // Add logic here to notify your team via Slack or Discord!
  }
  
  // Always acknowledge receipt to prevent MeetSphere from retrying
  res.status(200).send('Webhook successfully received');
});

// Start your custom server
app.listen(8080, () => console.log('Listening for webhooks on port 8080...'));`}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default DeveloperDocs;
