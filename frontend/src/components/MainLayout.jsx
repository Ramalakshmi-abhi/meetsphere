import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import './MainLayout.css';
import { useAuth } from '../context/AuthContext';

const MainLayout = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isMobileView, setIsMobileView] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        return window.innerWidth <= 1024;
    });

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobileView(mobile);

            if (!mobile) {
                setIsMobileSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className={`app-layout ${isMobileSidebarOpen ? 'sidebar-open' : ''}`}>
            <Sidebar
                isMobile={isMobileView}
                isOpen={isMobileView ? isMobileSidebarOpen : true}
                onClose={() => setIsMobileSidebarOpen(false)}
            />

            {isMobileView && isMobileSidebarOpen && (
                <button
                    type="button"
                    className="sidebar-overlay"
                    aria-label="Close navigation menu"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            <main className="main-content-area">
                <header className="content-header">
                    <div className="header-left">
                        {isMobileView && (
                            <button
                                type="button"
                                className="mobile-menu-btn"
                                aria-label="Open navigation menu"
                                onClick={() => setIsMobileSidebarOpen(true)}
                            >
                                <Menu size={18} />
                            </button>
                        )}
                        <div className="breadcrumb">MeetSphere &gt; Product</div>
                    </div>

                    <div className="user-nav">
                        <span className="user-subscription">
                            {isMobileView
                                ? (user?.name || 'User')
                                : `${user?.name || 'User'} (${user?.plan || 'Basic'})`}
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
