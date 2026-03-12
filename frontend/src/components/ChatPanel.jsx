import React, { useState, useEffect } from 'react';
import { Send, X, File } from 'lucide-react';
import './ChatPanel.css';

export default function ChatPanel({ socket, roomId, user, closeChat }) {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);

    useEffect(() => {
        socket.on('message-received', (data) => {
            setChatHistory(prev => [...prev, data]);
        });
        return () => socket.off('message-received');
    }, [socket]);

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
        <div className="chat-panel">
            <header className="chat-header">
                <h3>Chat</h3>
                <button onClick={closeChat}><X size={20} /></button>
            </header>
            <div className="chat-messages">
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`message ${msg.sender === user.name ? 'own' : ''}`}>
                        <div className="msg-info">
                            <span className="sender">{msg.sender}</span>
                            <span className="time">{msg.time}</span>
                        </div>
                        <div className="msg-text">{msg.text}</div>
                    </div>
                ))}
            </div>
            <form className="chat-input" onSubmit={sendMessage}>
                <button type="button" className="file-btn"><File size={18} /></button>
                <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit" className="send-btn"><Send size={18} /></button>
            </form>
        </div>
    );
}
