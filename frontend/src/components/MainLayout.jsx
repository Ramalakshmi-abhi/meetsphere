import React from 'react';
import Sidebar from './Sidebar';
import './MainLayout.css';
import { useAuth } from '../context/AuthContext';

const MainLayout = ({ children }) => {
    const { user } = useAuth();
    
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content-area">
                <header className="content-header">
                    <div className="breadcrumb">MeetSphere › Product</div>
                    <div className="user-nav">
                        <span className="user-subscription">
                            {user?.name || 'User'} ({user?.plan || 'Basic'})
                        </span>
                        <div className="user-avatar">{user?.name ? user.name[0] : '?'}</div>
                    </div>
                </header>
                <div className="content-viewport">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
