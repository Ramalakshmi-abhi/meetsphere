import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MeetingRoom from './pages/MeetingRoom';
import LiveKitMeetingRoom from './pages/LiveKitMeetingRoom';
import AdminDashboard from './pages/AdminDashboard';
import ScheduleMeeting from './pages/ScheduleMeeting';
import MainLayout from './components/MainLayout';
import JoinMeeting from './pages/JoinMeeting';
import MyMeetings from './pages/MyMeetings';
import QuickMeeting from './pages/QuickMeeting';
import Subscription from './pages/Subscription';
import Contacts from './pages/Contacts';
import Recordings from './pages/Recordings';
import Analytics from './pages/Analytics';
import Invoices from './pages/Invoices';
import DeveloperSettings from './pages/DeveloperSettings';
import DeveloperDocs from './pages/DeveloperDocs';
import MeetingSettings from './pages/MeetingSettings';
import BrandedConference from './pages/BrandedConference';
import { ENABLE_LIVEKIT } from './api';
import './App.css';

const PrivateRoute = ({ children }) => {
    const { user } = useAuth();
    return user ? <MainLayout>{children}</MainLayout> : <Navigate to="/login" />;
};

const routeTitles = {
    '/login': 'Login - MeetSphere',
    '/signup': 'Sign Up - MeetSphere',
    '/dashboard': 'Dashboard - MeetSphere',
    '/schedule': 'Schedule Meeting - MeetSphere',
    '/join': 'Join Meeting - MeetSphere',
    '/my-meetings': 'My Meetings - MeetSphere',
    '/quick': 'Quick Meeting - MeetSphere',
    '/subscription': 'Subscription - MeetSphere',
    '/contacts': 'Contacts - MeetSphere',
    '/recordings': 'Recordings - MeetSphere',
    '/analytics': 'Analytics - MeetSphere',
    '/invoices': 'Invoices - MeetSphere',
    '/developers': 'Developer Settings - MeetSphere',
    '/developers/docs': 'Developer Docs - MeetSphere',
    '/settings': 'Meeting Settings - MeetSphere',
    '/branded': 'Branded Conference - MeetSphere',
    '/admin': 'Admin Dashboard - MeetSphere',
    '/': 'MeetSphere',
};

function RouteTitleManager() {
    const location = useLocation();

    useEffect(() => {
        if (location.pathname.startsWith('/room/')) {
            return;
        }

        document.title = routeTitles[location.pathname] || 'MeetSphere';
    }, [location.pathname]);

    return null;
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <RouteTitleManager />
                <div className="app-container">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        
                        {/* Private Routes with Sidebar Layout */}
                        <Route 
                            path="/dashboard" 
                            element={
                                <PrivateRoute>
                                    <Dashboard />
                                </PrivateRoute>
                            } 
                        />
                        <Route 
                            path="/schedule" 
                            element={
                                <PrivateRoute>
                                    <ScheduleMeeting />
                                </PrivateRoute>
                            } 
                        />
                        
                        {/* Sidebar Menu Routes */}
                        <Route path="/join" element={<PrivateRoute><JoinMeeting /></PrivateRoute>} />
                        <Route path="/my-meetings" element={<PrivateRoute><MyMeetings /></PrivateRoute>} />
                        <Route path="/quick" element={<PrivateRoute><QuickMeeting /></PrivateRoute>} />
                        <Route path="/subscription" element={<PrivateRoute><Subscription /></PrivateRoute>} />
                        <Route path="/contacts" element={<PrivateRoute><Contacts /></PrivateRoute>} />
                        <Route path="/recordings" element={<PrivateRoute><Recordings /></PrivateRoute>} />
                        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
                        <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
                        <Route path="/developers" element={<PrivateRoute><DeveloperSettings /></PrivateRoute>} />
                        <Route path="/developers/docs" element={<PrivateRoute><DeveloperDocs /></PrivateRoute>} />
                        <Route path="/settings" element={<PrivateRoute><MeetingSettings /></PrivateRoute>} />
                        <Route path="/branded" element={<PrivateRoute><BrandedConference /></PrivateRoute>} />

                        {/* Direct Room Route (Usually no sidebar) */}
                        <Route 
                            path="/room/:roomId" 
                            element={ENABLE_LIVEKIT ? <LiveKitMeetingRoom /> : <MeetingRoom />} 
                        />

                        <Route 
                            path="/admin" 
                            element={
                                <PrivateRoute>
                                    <AdminDashboard />
                                </PrivateRoute>
                            } 
                        />
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
