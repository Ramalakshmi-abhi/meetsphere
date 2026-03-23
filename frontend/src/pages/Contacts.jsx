import React, { useState, useEffect } from 'react';
import { Search, Plus, Mail, Phone, Edit2, Trash2, UserPlus, Filter, X, CheckCircle2 } from 'lucide-react';
import api from '../api';
import './MenuPages.css';

const Contacts = () => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    // Search and Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('asc');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({ name: '', role: '', email: '', phone: '' });

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const res = await api.get('/api/contacts');
            setContacts(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch contacts", err);
            setError('Failed to load contacts from server.');
            setLoading(false);
        }
    };

    const openModal = (contact = null) => {
        if (contact) {
            setEditingContact(contact);
            setFormData({ name: contact.name, role: contact.role, email: contact.email, phone: contact.phone });
        } else {
            setEditingContact(null);
            setFormData({ name: '', role: '', email: '', phone: '' });
        }
        setIsModalOpen(true);
        setError('');
        setSuccessMessage('');
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingContact(null);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveContact = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            if (editingContact) {
                // Update specific contact via PUT
                const res = await api.put(`/api/contacts/${editingContact._id}`, formData);
                setContacts(contacts.map(c => c._id === res.data._id ? res.data : c));
                setSuccessMessage('Contact updated successfully!');
            } else {
                // Create new contact via POST
                const res = await api.post('/api/contacts', formData);
                setContacts([res.data, ...contacts]);
                setSuccessMessage('Contact added successfully!');
            }
            closeModal();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error("Error saving contact", err);
            setError(err.response?.data?.msg || 'Error saving contact. Please check your inputs.');
        }
    };

    const handleDeleteContact = async (id, e) => {
        e.stopPropagation(); // prevent triggering other clicks
        if (!window.confirm("Are you sure you want to permanently delete this contact?")) return;
        
        try {
            await api.delete(`/api/contacts/${id}`);
            setContacts(contacts.filter(c => c._id !== id));
            setSuccessMessage('Contact deleted successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error("Error deleting contact", err);
            setError('Error deleting contact.');
        }
    };

    // UI Helper
    const getInitials = (name) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    // Filter and Sort Logic
    const filteredContacts = contacts
        .filter(c => {
            const query = searchQuery.toLowerCase();
            return (
                (c.name && c.name.toLowerCase().includes(query)) || 
                (c.email && c.email.toLowerCase().includes(query)) ||
                (c.role && c.role.toLowerCase().includes(query))
            );
        })
        .sort((a, b) => {
            if (sortOrder === 'asc') return (a.name || '').localeCompare(b.name || '');
            return (b.name || '').localeCompare(a.name || '');
        });

    return (
        <div className="menu-page relative">
            <div className="page-header-row">
                <div className="header-left">
                    <h1>My Contacts</h1>
                    <p className="subtitle">Manage and invite your meeting participants</p>
                </div>
                <button className="btn-primary" onClick={() => openModal()}>
                    <UserPlus size={18} /> Add Contact
                </button>
            </div>

            {successMessage && (
                <div className="success-banner" style={{ background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeIn 0.3s' }}>
                    <CheckCircle2 size={20} /> {successMessage}
                </div>
            )}
            
            {error && !isModalOpen && (
                <div className="error-banner" style={{ background: '#fee2e2', color: '#991b1b', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            <div className="contacts-toolbar">
                <div className="search-wrap">
                    <Search size={18} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Search contacts..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button 
                    className="btn-outline" 
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                    <Filter size={18} /> Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading contacts database...</div>
            ) : (
                <div className="contacts-grid">
                    {filteredContacts.map(contact => (
                        <div key={contact._id} className="contact-card" style={{ position: 'relative' }}>
                            <div className="contact-info-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="avatar" style={{ width: '48px', height: '48px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                                    {getInitials(contact.name)}
                                </div>
                                
                                <div className="contact-card-actions" style={{ display: 'flex', gap: '8px' }}>
                                    <button className="icon-btn" onClick={() => openModal(contact)} title="Edit Configuration" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="icon-btn" onClick={(e) => handleDeleteContact(contact._id, e)} title="Delete Contact" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="contact-details">
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>{contact.name}</h3>
                                <span className="role" style={{ color: '#64748b', fontSize: '0.875rem' }}>{contact.role || 'Contact'}</span>
                            </div>

                            <div className="contact-actions" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div className="action-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.875rem' }}>
                                    <Mail size={16} />
                                    <span>{contact.email}</span>
                                </div>
                                <div className="action-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.875rem' }}>
                                    <Phone size={16} />
                                    <span>{contact.phone || 'No phone added'}</span>
                                </div>
                            </div>

                            <div className="card-footer" style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
                                <button className="btn-outline-sm" style={{ flex: 1, justifyContent: 'center' }}>Message</button>
                                <button className="btn-primary-sm" style={{ flex: 1, justifyContent: 'center' }}>Invite</button>
                            </div>
                        </div>
                    ))}

                    <div className="contact-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', background: '#f8fafc', border: '2px dashed #cbd5e1', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'none' }} onClick={() => openModal()} onMouseOver={(e) => e.currentTarget.style.borderColor = '#6366f1'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}>
                        <div className="add-icon" style={{ width: '48px', height: '48px', background: '#e0e7ff', color: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                            <Plus size={24} />
                        </div>
                        <span style={{ color: '#64748b', fontWeight: '600' }}>Add New Contact</span>
                    </div>
                </div>
            )}

            {/* Editable Modal Interface */}
            {isModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s' }}>
                    <div className="modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '1.25rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>{editingContact ? 'Edit Contact' : 'Add New Contact'}</h2>
                            <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        {error && (
                            <div className="error-message" style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }} placeholder="John Doe" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }} placeholder="john@example.com" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Role / Company</label>
                                <input type="text" name="role" value={formData.role} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }} placeholder="Project Manager" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Phone Number</label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }} placeholder="+1 234 567 8900" />
                            </div>
                            
                            <div className="modal-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={closeModal} className="btn-outline">Cancel</button>
                                <button type="submit" className="btn-primary">{editingContact ? 'Save Changes' : 'Add Contact'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contacts;
