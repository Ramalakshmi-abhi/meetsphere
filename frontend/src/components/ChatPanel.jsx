import React, { useState, useEffect, useRef } from 'react';
import { Send, X, ExternalLink, Paperclip, Copy, Smile, MoreHorizontal, ThumbsUp, Heart } from 'lucide-react';
import './ChatPanel.css';

export default function ChatPanel({ socket, roomId, user, closeChat }) {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('main');
    const messagesEndRef = useRef(null);

    // Some dummy messages to populate the UI initially to match the screenshot
    useEffect(() => {
        setChatHistory([
            { id: 1, sender: 'ML', text: 'Ok phew 😂', time: '12:00 PM', isDummy: true },
            { id: 2, sender: 'Anthony Rios', text: 'Anyone have the slide deck I can download? Appreciate it', time: '12:01 PM', avatar: 'https://i.pravatar.cc/150?u=a', isDummy: true },
            { id: 3, sender: 'Robert Smith', text: 'Just DM-ed you!', time: '12:02 PM', avatar: 'https://i.pravatar.cc/150?u=r', reactions: [{ emoji: '👍', count: 1 }], isDummy: true },
            { id: 4, sender: 'Anthony Rios', text: 'Thanks Robert!', time: '12:02 PM', avatar: 'https://i.pravatar.cc/150?u=a', isDummy: true },
            { id: 5, sender: user.name, text: 'Thank you, everyone, for attending today’s marketing kickoff! Can’t wait for what the next quarter is about to bring. Enjoy your weekends 😊', time: '12:29 PM', avatar: 'https://i.pravatar.cc/150?u=y', reactions: [{ emoji: '👍', count: 6 }, { emoji: '💙', count: 15 }], isDummy: true },
        ]);
    }, [user.name]);

    useEffect(() => {
        const handleMessage = (data) => {
            setChatHistory(prev => [...prev, { ...data, id: Date.now() }]);
        };
        socket.on('message-received', handleMessage);
        return () => socket.off('message-received', handleMessage);
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            const data = {
                roomID: roomId,
                sender: user.name,
                text: message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            socket.emit('send-message', data);
            setMessage('');
        }
    };

    return (
        <div className="modern-chat-panel">
            <header className="m-chat-header">
                <div className="empty-spacer"></div>
                <h3>Meeting Chat</h3>
                <div className="m-chat-header-actions">
                    <button><ExternalLink size={18} /></button>
                    <button onClick={closeChat}><X size={20} /></button>
                </div>
            </header>

            <div className="m-chat-tabs">
                <button className={`m-tab ${activeTab === 'main' ? 'active' : ''}`} onClick={() => setActiveTab('main')}>
                    <div className="m-tab-icon groups-icon">
                        <UsersIcon />
                    </div>
                    <span>Main chat</span>
                </button>
                <button className={`m-tab ${activeTab === 'colleagues' ? 'active' : ''}`} onClick={() => setActiveTab('colleagues')}>
                    <div className="m-tab-icon avatars-icon">
                        <img src="https://i.pravatar.cc/150?u=1" alt="avatar" className="tiny-avatar" />
                        <img src="https://i.pravatar.cc/150?u=2" alt="avatar" className="tiny-avatar overlap" />
                        <div className="notification-dot">1</div>
                    </div>
                    <span>Colleagues</span>
                </button>
            </div>

            <div className="m-chat-messages">
                {chatHistory.map((msg) => {
                    const isOwn = msg.sender === user.name;
                    return (
                        <div key={msg.id} className={`m-message-row ${isOwn ? 'own-row' : ''}`}>
                            {!isOwn && (
                                <div className="m-avatar">
                                    {msg.avatar ? <img src={msg.avatar} alt={msg.sender} /> : msg.sender.substring(0,2).toUpperCase()}
                                </div>
                            )}
                            
                            <div className="m-message-content">
                                {!isOwn && (
                                    <div className="m-message-info">
                                        <span className="m-sender-name">{msg.sender}</span>
                                        <span className="m-sender-time">{msg.time}</span>
                                    </div>
                                )}
                                {isOwn && (
                                    <div className="m-message-info own-info">
                                        <span className="m-sender-name">You</span>
                                        <span className="m-sender-time">{msg.time}</span>
                                    </div>
                                )}
                                
                                <div className={`m-bubble ${isOwn ? 'own-bubble' : ''}`}>
                                    {msg.text}
                                </div>
                                
                                {msg.reactions && msg.reactions.length > 0 && (
                                    <div className={`m-reactions ${isOwn ? 'own-reactions' : ''}`}>
                                        {msg.reactions.map((r, i) => (
                                            <div key={i} className="m-reaction">
                                                {r.emoji} <span className="m-reaction-count">{r.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="m-chat-footer">
                <div className="m-chat-visibility">
                    <UserIconSmall /> Who can see your messages?
                </div>
                
                <form className="m-chat-input-area" onSubmit={sendMessage}>
                    <input 
                        type="text" 
                        placeholder="Message everyone" 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <div className="m-chat-toolbar">
                        <div className="m-toolbar-left">
                            <button type="button" title="Format"><span className="format-icon">A</span></button>
                            <button type="button" title="Attach"><Paperclip size={18} /></button>
                            <button type="button" title="Copy"><Copy size={18} /></button>
                            <button type="button" title="Emoji"><Smile size={18} /></button>
                            <button type="button" title="More"><MoreHorizontal size={18} /></button>
                        </div>
                        <button type="submit" className="m-send-btn" disabled={!message.trim()}>
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const UsersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);

const UserIconSmall = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);
