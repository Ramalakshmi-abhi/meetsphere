import React from 'react';
import { FileText, Download, CheckCircle2, Clock } from 'lucide-react';
import './MenuPages.css';

const Invoices = () => {
    const invoices = [
        { id: 'INV-2025-001', date: 'March 13, 2025', amount: '$12.00', status: 'Paid' },
        { id: 'INV-2025-002', date: 'Feb 13, 2025', amount: '$12.00', status: 'Paid' },
        { id: 'INV-2025-003', date: 'Jan 13, 2025', amount: '$12.00', status: 'Paid' },
        { id: 'INV-2024-012', date: 'Dec 13, 2024', amount: '$0.00', status: 'Paid' },
    ];

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Invoices</h1>
                <button className="btn-outline">Payment History</button>
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
                                <button className="btn-download"><Download size={16} /> PDF</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Invoices;
