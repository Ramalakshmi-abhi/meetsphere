import React, { useState } from 'react';
import { 
    Search, 
    MoreHorizontal, 
    Plus, 
    Send, 
    Paperclip, 
    Smile, 
    Phone, 
    Video, 
    Info,
    ChevronDown,
    Hash,
    User
} from 'lucide-react';
import './Messages.css';

const DUMMY_CHATS = [
    { id: 1, name: 'Marketing Squad', type: 'group', lastMsg: 'See you at the kickoff!', time: '12:29 PM', unread: 0, avatar: null },
    { id: 2, name: 'Project Cloud', type: 'group', lastMsg: 'The slide deck is ready.', time: '11:05 AM', unread: 2, avatar: null },
    { id: 3, name: 'Dream Team', type: 'group', lastMsg: 'Great work everyone! 🚀', time: 'Yesterday', unread: 0, avatar: null },
    { id: 4, name: 'Anthony Rios', type: 'direct', lastMsg: 'Thanks for the help!', time: '1:15 PM', unread: 1, avatar: 'https://i.pravatar.cc/150?u=a' },
    { id: 5, name: 'Robert Smith', type: 'direct', lastMsg: 'Just DM-ed you!', time: '12:02 PM', unread: 0, avatar: 'https://i.pravatar.cc/150?u=r' },
    { id: 6, name: 'Sarah Wilson', type: 'direct', lastMsg: 'Can we sync at 4?', time: '9:30 AM', unread: 0, avatar: 'https://i.pravatar.cc/150?u=s' },
];

export default function Messages() {
    const [selectedChat, setSelectedChat] = useState(DUMMY_CHATS[0]);
    const [message, setMessage] = useState('');

    const groups = DUMMY_CHATS.filter(c => c.type === 'group');
    const directMessages = DUMMY_CHATS.filter(c => c.type === 'direct');

    return (
        <div className="messages-page">
            <div className="messages-sidebar">
                <div className="messages-sidebar-header">
                    <h2>Messages</h2>
                    <button className="new-chat-btn"><Plus size={20} /></button>
                </div>

                <div className="messages-search">
                    <Search size={18} className="search-icon" />
                    <input type="text" placeholder="Search messages..." />
                </div>

                <div className="messages-list-container">
                    <div className="messages-section">
                        <div className="section-header">
                            <span>Groups</span>
                            <ChevronDown size={14} />
                        </div>
                        {groups.map(chat => (
                            <div 
                                key={chat.id} 
                                className={`chat-item ${selectedChat.id === chat.id ? 'active' : ''}`}
                                onClick={() => setSelectedChat(chat)}
                            >
                                <div className="chat-avatar-ring">
                                    <div className="chat-avatar group">
                                        <Hash size={18} />
                                    </div>
                                </div>
                                <div className="chat-info">
                                    <div className="chat-top">
                                        <span className="chat-name">{chat.name}</span>
                                        <span className="chat-time">{chat.time}</span>
                                    </div>
                                    <div className="chat-bottom">
                                        <p className="chat-last-msg">{chat.lastMsg}</p>
                                        {chat.unread > 0 && <span className="unread-badge">{chat.unread}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="messages-section">
                        <div className="section-header">
                            <span>Direct Messages</span>
                            <ChevronDown size={14} />
                        </div>
                        {directMessages.map(chat => (
                            <div 
                                key={chat.id} 
                                className={`chat-item ${selectedChat.id === chat.id ? 'active' : ''}`}
                                onClick={() => setSelectedChat(chat)}
                            >
                                <div className="chat-avatar-ring">
                                    <div className="chat-avatar">
                                        {chat.avatar ? <img src={chat.avatar} alt={chat.name} /> : <User size={18} />}
                                    </div>
                                    <div className="online-indicator"></div>
                                </div>
                                <div className="chat-info">
                                    <div className="chat-top">
                                        <span className="chat-name">{chat.name}</span>
                                        <span className="chat-time">{chat.time}</span>
                                    </div>
                                    <div className="chat-bottom">
                                        <p className="chat-last-msg">{chat.lastMsg}</p>
                                        {chat.unread > 0 && <span className="unread-badge">{chat.unread}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="chat-window">
                <header className="chat-window-header">
                    <div className="current-chat-info">
                        <div className="chat-avatar-ring">
                            <div className={`chat-avatar ${selectedChat.type === 'group' ? 'group' : ''}`}>
                                {selectedChat.avatar ? <img src={selectedChat.avatar} alt={selectedChat.name} /> : (selectedChat.type === 'group' ? <Hash size={20} /> : <User size={20} />)}
                            </div>
                        </div>
                        <div>
                            <h3>{selectedChat.name}</h3>
                            <span className="status-text">{selectedChat.type === 'group' ? '12 members' : 'Online'}</span>
                        </div>
                    </div>
                    <div className="chat-actions">
                        <button><Phone size={20} /></button>
                        <button><Video size={20} /></button>
                        <button><Info size={20} /></button>
                        <button><MoreHorizontal size={20} /></button>
                    </div>
                </header>

                <div className="chat-messages-area">
                    <div className="message-date-divider"><span>Today, March 26</span></div>
                    
                    <div className="message-row">
                        <div className="m-avatar">ML</div>
                        <div className="message-content">
                            <div className="message-meta">
                                <span className="m-sender">Maya Lopez</span>
                                <span className="m-time">12:00 PM</span>
                            </div>
                            <div className="message-bubble">
                                Hey team! Have we finalized the deck for the marketing kickoff?
                            </div>
                        </div>
                    </div>

                    <div className="message-row">
                        <div className="m-avatar"><img src="https://i.pravatar.cc/150?u=a" alt="Anthony" /></div>
                        <div className="message-content">
                            <div className="message-meta">
                                <span className="m-sender">Anthony Rios</span>
                                <span className="m-time">12:01 PM</span>
                            </div>
                            <div className="message-bubble">
                                Working on the last few slides now. Should be ready in 10 mins!
                            </div>
                        </div>
                    </div>

                    <div className="message-row own">
                        <div className="message-content">
                            <div className="message-meta">
                                <span className="m-sender">You</span>
                                <span className="m-time">12:05 PM</span>
                            </div>
                            <div className="message-bubble">
                                Perfect, I'll review them as soon as you're done.
                            </div>
                        </div>
                    </div>

                    <div className="message-row">
                        <div className="m-avatar"><img src="https://i.pravatar.cc/150?u=r" alt="Robert" /></div>
                        <div className="message-content">
                            <div className="message-meta">
                                <span className="m-sender">Robert Smith</span>
                                <span className="m-time">12:06 PM</span>
                            </div>
                            <div className="message-bubble">
                                I've already added the analytics part to slide 4.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="chat-input-footer">
                    <div className="chat-input-container">
                        <div className="chat-input-toolbar">
                            <button><Plus size={18} /></button>
                            <button><Smile size={18} /></button>
                        </div>
                        <input 
                            type="text" 
                            placeholder={`Message ${selectedChat.name}`} 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <div className="chat-input-actions">
                            <button><Paperclip size={18} /></button>
                            <button className="send-btn" disabled={!message.trim()}><Send size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
