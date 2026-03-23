import React, { useState } from 'react';
import { Download, CheckCircle2, Clock, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import './MenuPages.css';

const Invoices = () => {
    const [showHistory, setShowHistory] = useState(false);
    const invoices = [
        { id: 'INV-2025-001', date: 'March 13, 2025', amount: '$12.00', status: 'Paid' },
        { id: 'INV-2025-002', date: 'Feb 13, 2025', amount: '$12.00', status: 'Paid' },
        { id: 'INV-2025-003', date: 'Jan 13, 2025', amount: '$12.00', status: 'Paid' },
        { id: 'INV-2024-012', date: 'Dec 13, 2024', amount: '$0.00', status: 'Paid' },
    ];

    const handleDownloadPDF = (inv) => {
        const doc = new jsPDF();
        
        // Brand Header
        doc.setFontSize(22);
        doc.setTextColor(37, 99, 235); // Blue color
        doc.text("MeetSphere", 20, 20);
        
        doc.setFontSize(16);
        doc.setTextColor(50, 50, 50);
        doc.text("INVOICE", 160, 20);
        
        // Invoice Meta
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text("Invoice ID: " + inv.id, 160, 30);
        doc.text("Date: " + inv.date, 160, 36);
        doc.text("Status: " + inv.status, 160, 42);

        // Bill To
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Billed To:", 20, 50);
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text("MeetSphere User", 20, 58);
        doc.text("Premium Subscription", 20, 64);

        // Table Header
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, 80, 190, 80);
        
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text("Description", 20, 88);
        doc.text("Amount", 170, 88);
        
        doc.line(20, 94, 190, 94);

        // Table Row
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text("Monthly Pro Subscription (" + inv.date.split(',')[0] + ")", 20, 104);
        doc.setTextColor(0, 0, 0);
        doc.text(inv.amount, 170, 104);

        doc.line(20, 114, 190, 114);
        
        // Total
        doc.setFont(undefined, 'bold');
        doc.text("Total:", 140, 124);
        doc.text(inv.amount, 170, 124);

        // Footer
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text("Thank you for choosing MeetSphere!", 105, 275, null, null, "center");

        // Save
        doc.save(inv.id + ".pdf");
    };

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Invoices</h1>
                <button className="btn-outline" onClick={() => setShowHistory(true)}>
                    <Clock size={16} /> Payment History
                </button>
            </div>

            <div className="billing-summary-grid">
                <div className="bill-card highlight">
                    <span className="bill-label">Total Spent (YTD)</span>
                    <span className="bill-value">$36.00</span>
                </div>
                <div className="bill-card">
                    <span className="bill-label">Upcoming Payment</span>
                    <span className="bill-value">$12.00</span>
                    <span className="bill-date">Due April 13, 2025</span>
                </div>
            </div>

            <div className="invoices-list-wrapper">
                <div className="invoice-table">
                    <div className="inv-header">
                        <div>Invoice ID</div>
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Status</div>
                        <div>Action</div>
                    </div>
                    {invoices.map(inv => (
                        <div key={inv.id} className="inv-row">
                            <div className="inv-id"><strong>{inv.id}</strong></div>
                            <div className="inv-date">{inv.date}</div>
                            <div className="inv-amount">{inv.amount}</div>
                            <div className="inv-status">
                                <span className={`status-pill ${inv.status.toLowerCase()}`}>
                                    <CheckCircle2 size={14} /> {inv.status}
                                </span>
                            </div>
                            <div className="inv-action">
                                <button className="btn-download" onClick={() => handleDownloadPDF(inv)}>
                                    <Download size={16} /> PDF
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment History Modal Dialog */}
            {showHistory && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s' }}>
                    <div className="modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '1.25rem', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '0.75rem', color: '#6366f1' }}>
                                    <Clock size={24} />
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Payment History</h2>
                            </div>
                            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                            {invoices.map((inv, index) => (
                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '1rem', background: '#f8fafc', transition: 'all 0.2s', cursor: 'default' }} onMouseOver={(e) => {e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'}} onMouseOut={(e) => {e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'}}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        <strong style={{ color: '#1e293b', fontSize: '1.05rem', fontWeight: '700' }}>{inv.id}</strong>
                                        <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Processed on {inv.date}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                                        <strong style={{ color: '#1e293b', fontSize: '1.125rem', fontWeight: '800' }}>{inv.amount}</strong>
                                        <span className={`status-pill ${inv.status.toLowerCase()}`} style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: '#dcfce7', color: '#166534', borderRadius: '2rem' }}>
                                            <CheckCircle2 size={12} style={{ marginRight: '0.25rem' }}/> {inv.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invoices;
