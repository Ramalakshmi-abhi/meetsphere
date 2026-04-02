import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, X, ExternalLink, Paperclip, Copy, Smile, MoreHorizontal } from 'lucide-react';
import './ChatPanel.css';

export default function ChatPanel({
    socket,
    roomId,
    user,
    closeChat,
    socketConnected,
    chatHistory: externalChatHistory,
    onAppendMessage,
}) {
    const [message, setMessage] = useState('');
    const [localChatHistory, setLocalChatHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('main');
    const [status, setStatus] = useState({ type: '', text: '' });
    const [isConnected, setIsConnected] = useState(Boolean(socketConnected ?? socket?.connected));
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const statusTimerRef = useRef(null);

    const senderName = String(user?.name || 'Guest').trim() || 'Guest';
    const hasExternalHistory = Array.isArray(externalChatHistory);
    const chatHistory = hasExternalHistory ? externalChatHistory : localChatHistory;

    const clearStatusTimer = () => {
        if (statusTimerRef.current) {
            window.clearTimeout(statusTimerRef.current);
            statusTimerRef.current = null;
        }
    };

    const showStatus = useCallback((type, text) => {
        clearStatusTimer();
        setStatus({ type, text });
        statusTimerRef.current = window.setTimeout(() => {
            setStatus({ type: '', text: '' });
            statusTimerRef.current = null;
        }, 2800);
    }, []);

    const appendIncomingMessage = useCallback((incoming) => {
        const normalized = {
            ...incoming,
            id: incoming?.id
                || incoming?.messageId
                || `${incoming?.sender || 'user'}-${incoming?.time || Date.now()}-${incoming?.text || ''}`,
        };

        const updater = (prev) => {
            if (prev.some((entry) => entry.id === normalized.id)) {
                return prev;
            }
            return [...prev, normalized];
        };

        if (typeof onAppendMessage === 'function') {
            onAppendMessage(normalized);
            return;
        }

        setLocalChatHistory(updater);
    }, [onAppendMessage]);

    useEffect(() => {
        if (!socket) {
            setIsConnected(false);
            return undefined;
        }

        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);

        setIsConnected(Boolean(socketConnected ?? socket.connected));

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        if (!hasExternalHistory) {
            const handleMessage = (data) => appendIncomingMessage(data);
            socket.on('message-received', handleMessage);

            return () => {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
                socket.off('message-received', handleMessage);
            };
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, [appendIncomingMessage, hasExternalHistory, socket, socketConnected]);

    useEffect(() => {
        setIsConnected(Boolean(socketConnected ?? socket?.connected));
    }, [socket, socketConnected]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    useEffect(() => () => {
        clearStatusTimer();
    }, []);

    const sendMessage = (event) => {
        event.preventDefault();
        const trimmed = message.trim();
        if (!trimmed) {
            return;
        }

        if (!socket || !socket.connected) {
            showStatus('error', 'Chat server disconnected. Please wait for reconnection.');
            return;
        }

        const payload = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            roomID: roomId,
            sender: senderName,
            text: trimmed,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        appendIncomingMessage(payload);
        socket.emit('send-message', payload);
        setMessage('');
        setStatus({ type: '', text: '' });
    };

    const popOutChat = () => {
        window.open('/messages', '_blank', 'noopener,noreferrer');
    };

    const openColleaguesTab = () => {
        setActiveTab('colleagues');
        showStatus('info', 'Direct messages are coming soon. Use Main chat for now.');
    };

    const toggleBoldDraft = () => {
        const trimmed = message.trim();
        if (!trimmed) {
            return;
        }

        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            setMessage(trimmed.slice(2, -2));
            return;
        }

        setMessage(`**${trimmed}**`);
    };

    const attachFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) {
            return;
        }

        const labels = files.map((file) => `[Attachment: ${file.name}]`).join(' ');
        setMessage((prev) => `${prev}${prev ? ' ' : ''}${labels}`);
        showStatus('info', 'Attachment name added to draft. Upload support is coming soon.');
        event.target.value = '';
    };

    const copyDraft = async () => {
        const trimmed = message.trim();
        if (!trimmed) {
            showStatus('info', 'Write a message first, then copy.');
            return;
        }

        try {
            await navigator.clipboard.writeText(trimmed);
            showStatus('info', 'Draft copied to clipboard.');
        } catch {
            showStatus('error', 'Unable to copy draft on this browser.');
        }
    };

    const addEmoji = () => {
        setMessage((prev) => `${prev}${prev ? ' ' : ''}\u{1F60A}`);
    };

    const insertQuickReaction = () => {
        setMessage((prev) => `${prev}${prev ? ' ' : ''}\u{1F44D}`);
    };

    return (
        <div className="modern-chat-panel">
            <header className="m-chat-header">
                <div className="empty-spacer" />
                <h3>Meeting Chat</h3>
                <div className="m-chat-header-actions">
                    <button type="button" onClick={popOutChat} title="Open full chat">
                        <ExternalLink size={18} />
                    </button>
                    <button type="button" onClick={closeChat} title="Close chat">
                        <X size={20} />
                    </button>
                </div>
            </header>

            <div className="m-chat-tabs">
                <button className={`m-tab ${activeTab === 'main' ? 'active' : ''}`} onClick={() => setActiveTab('main')}>
                    <div className="m-tab-icon groups-icon">
                        <UsersIcon />
                    </div>
                    <span>Main chat</span>
                </button>
                <button className={`m-tab ${activeTab === 'colleagues' ? 'active' : ''}`} onClick={openColleaguesTab}>
                    <div className="m-tab-icon avatars-icon">
                        <img src="https://i.pravatar.cc/150?u=1" alt="avatar" className="tiny-avatar" />
                        <img src="https://i.pravatar.cc/150?u=2" alt="avatar" className="tiny-avatar overlap" />
                        <div className="notification-dot">1</div>
                    </div>
                    <span>Colleagues</span>
                </button>
            </div>

            <div className="m-chat-messages">
                {chatHistory.length === 0 && (
                    <div className="m-empty-state">
                        {isConnected ? 'No messages yet. Start the conversation.' : 'Chat disconnected. Reconnecting...'}
                    </div>
                )}

                {chatHistory.map((msg) => {
                    const isOwn = msg.sender === senderName;
                    return (
                        <div key={msg.id} className={`m-message-row ${isOwn ? 'own-row' : ''}`}>
                            {!isOwn && (
                                <div className="m-avatar">
                                    {msg.avatar ? <img src={msg.avatar} alt={msg.sender} /> : msg.sender.substring(0, 2).toUpperCase()}
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

                                {Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
                                    <div className={`m-reactions ${isOwn ? 'own-reactions' : ''}`}>
                                        {msg.reactions.map((reaction, index) => (
                                            <div key={index} className="m-reaction">
                                                {reaction.emoji} <span className="m-reaction-count">{reaction.count}</span>
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
                    <UserIconSmall /> Who can see your messages? Everyone in this room
                </div>

                {!isConnected && (
                    <div className="m-chat-status error">
                        Chat server disconnected. Messages will send once connection returns.
                    </div>
                )}
                {status.text && (
                    <div className={`m-chat-status ${status.type === 'error' ? 'error' : ''}`}>
                        {status.text}
                    </div>
                )}

                <form className="m-chat-input-area" onSubmit={sendMessage}>
                    <input
                        type="text"
                        placeholder={isConnected ? 'Message everyone' : 'Waiting for chat reconnection...'}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="m-hidden-file-input"
                        onChange={handleFileSelected}
                        multiple
                    />

                    <div className="m-chat-toolbar">
                        <div className="m-toolbar-left">
                            <button type="button" title="Bold draft" onClick={toggleBoldDraft}><span className="format-icon">A</span></button>
                            <button type="button" title="Attach file" onClick={attachFile}><Paperclip size={18} /></button>
                            <button type="button" title="Copy draft" onClick={copyDraft}><Copy size={18} /></button>
                            <button type="button" title="Insert emoji" onClick={addEmoji}><Smile size={18} /></button>
                            <button type="button" title="Insert thumbs up" onClick={insertQuickReaction}><MoreHorizontal size={18} /></button>
                        </div>
                        <button type="submit" className="m-send-btn" disabled={!message.trim() || !isConnected}>
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
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const UserIconSmall = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
