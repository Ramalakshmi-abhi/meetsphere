import React, { useState } from 'react';
import { Search, Plus, Mail, Phone, MoreVertical, UserPlus, Filter } from 'lucide-react';
import './MenuPages.css';

const Contacts = () => {
    const [contacts] = useState([
        { id: 1, name: 'Alex Rivera', email: 'alex@example.com', role: 'Project Manager', status: 'Online' },
        { id: 2, name: 'Sarah Chen', email: 'sarah.c@example.com', role: 'UX Designer', status: 'Away' },
        { id: 3, name: 'Marcus Smith', email: 'm.smith@example.com', role: 'Developer', status: 'Offline' },
        { id: 4, name: 'Elena Rodriguez', email: 'elena@example.com', role: 'Product Owner', status: 'Online' },
        { id: 5, name: 'David Kim', email: 'david.k@example.com', role: 'QA Lead', status: 'Offline' },
    ]);

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <div className="header-left">
                    <h1>My Contacts</h1>
                    <p className="subtitle">Manage and invite your meeting participants</p>
                </div>
                <button className="btn-primary">
                    <UserPlus size={18} /> Add Contact
                </button>
            </div>

            <div className="contacts-toolbar">
                <div className="search-wrap">
                    <Search size={18} className="search-icon" />
                    <input type="text" placeholder="Search contacts..." />
                </div>
                <button className="btn-outline">
                    <Filter size={18} /> Filter
                </button>
            </div>

            <div className="contacts-grid">
                {contacts.map(contact => (
                    <div key={contact.id} className="contact-card">
                        <div className="contact-info-top">
                            <div className={`avatar ${contact.status.toLowerCase()}`}>
                                {contact.name[0]}
                                <div className="status-indicator"></div>
                            </div>
                            <button className="icon-btn"><MoreVertical size={18} /></button>
                        </div>
                        
                        <div className="contact-details">
                            <h3>{contact.name}</h3>
                            <span className="role">{contact.role}</span>
                        </div>

                        <div className="contact-actions">
                            <div className="action-item">
                                <Mail size={16} />
                                <span>{contact.email}</span>
                            </div>
                            <div className="action-item">
                                <Phone size={16} />
                                <span>+1 234 567 890</span>
                            </div>
                        </div>

                        <div className="card-footer">
                            <button className="btn-outline-sm full-width">Message</button>
                            <button className="btn-primary-sm full-width">Invite</button>
                        </div>
                    </div>
                ))}

                <div className="add-contact-card">
                    <div className="add-icon">
                        <Plus size={32} />
                    </div>
                    <span>Add New Contact</span>
                </div>
            </div>
        </div>
    );
};

export default Contacts;
