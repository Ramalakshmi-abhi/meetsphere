import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import axios from 'axios'

const envBaseUrl = import.meta.env.VITE_BACKEND_URL || '';
axios.defaults.baseURL = envBaseUrl.endsWith('/') ? envBaseUrl.slice(0, -1) : envBaseUrl;

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)
