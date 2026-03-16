import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Video, 
    PlayCircle, 
    Calendar, 
    Users, 
    Mic2, 
    BarChart3, 
    FileText, 
    Code2, 
    Settings, 
    Monitor,
    CreditCard,
    LogOut
} from 'lucide-react';
import './Sidebar.css';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { logout } = useAuth();
    const location = useLocation();

    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
        { icon: <Video size={20} />, label: 'Join Meeting', path: '/join' },
        { icon: <PlayCircle size={20} />, label: 'My Meetings', path: '/my-meetings' },
        { icon: <Mic2 size={20} />, label: 'Quick Meeting', path: '/quick' },
        { icon: <Calendar size={20} />, label: 'Schedule Meeting', path: '/schedule' },
        { icon: <CreditCard size={20} />, label: 'My Subscription', path: '/subscription' },
        { icon: <Users size={20} />, label: 'My Contacts', path: '/contacts' },
        { icon: <PlayCircle size={20} />, label: 'Recordings', path: '/recordings' },
        { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/analytics' },
        { icon: <FileText size={20} />, label: 'Invoices', path: '/invoices' },
        { icon: <Code2 size={20} />, label: 'Developers', path: '/developers' },
        { icon: <Settings size={20} />, label: 'Meeting Settings', path: '/settings' },
        { icon: <Monitor size={20} />, label: 'Branded Conference', path: '/branded' },
    ];

    return (
        <aside className="app-sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Video className="logo-icon" />
                    <span>MeetSphere</span>
                </div>
            </div>
            
            <nav className="sidebar-nav">
                {menuItems.map((item, index) => (
                    <NavLink 
                        key={index} 
                        to={item.path} 
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button onClick={logout} className="logout-btn">
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
