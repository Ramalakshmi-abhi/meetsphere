import React from 'react';
import { Check, Star, Shield, Zap } from 'lucide-react';
import './MenuPages.css';

const Subscription = () => {
    const plans = [
        {
            name: 'Basic',
            price: '$0',
            features: ['Unlimited 1:1 meetings', '40 min group meetings', 'HD Video', 'Screen Sharing'],
            isCurrent: false,
            color: '#94a3b8'
        },
        {
            name: 'Personal',
            price: '$12',
            features: ['Unlimited group meetings', 'Cloud Recording', 'AI Summaries', 'Advanced Security', 'Custom Branding'],
            isCurrent: true,
            isPopular: true,
            color: '#6366f1'
        },
        {
            name: 'Business',
            price: '$25',
            features: ['SSO & Active Directory', 'Admin Dashboard', 'White-labeling', 'Dedicated Support', '24/7 Priority'],
            isCurrent: false,
            color: '#1e293b'
        }
    ];

    return (
        <div className="menu-page subscription-page">
            <div className="page-header-row">
                <h1>My Subscription</h1>
                <div className="active-badge">Active Plan: Developer</div>
            </div>

            <div className="pricing-grid">
                {plans.map((plan, i) => (
                    <div key={i} className={`plan-card ${plan.isCurrent ? 'current' : ''}`}>
                        {plan.isPopular && <div className="popular-tag">MOST POPULAR</div>}
                        <div className="plan-icon" style={{ background: plan.color }}>
                            {plan.name === 'Basic' ? <Shield size={24} /> : plan.name === 'Personal' ? <Star size={24} /> : <Zap size={24} />}
                        </div>
                        <h3>{plan.name}</h3>
                        <div className="plan-price">
                            <span className="amount">{plan.price}</span>
                            <span className="period">/month</span>
                        </div>
                        <ul className="feature-list">
                            {plan.features.map((f, j) => (
                                <li key={j}><Check size={16} /> {f}</li>
                            ))}
                        </ul>
                        <button className={`plan-btn ${plan.isCurrent ? 'disabled' : ''}`}>
                            {plan.isCurrent ? 'Current Plan' : 'Upgrade Now'}
                        </button>
                    </div>
                ))}
            </div>

            <div className="billing-banner">
                <div className="billing-info">
                    <strong>Next Billing Date</strong>
                    <span>April 13, 2026</span>
                </div>
                <div className="billing-info">
                    <strong>Payment Method</strong>
                    <span>Visa ending in 4242</span>
                </div>
                <button className="manage-billing">Manage Billing</button>
            </div>
        </div>
    );
};

export default Subscription;
