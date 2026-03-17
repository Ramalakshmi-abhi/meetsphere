import React, { useState } from 'react';
import { Check, Star, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './MenuPages.css';

const Subscription = () => {
    const { user, login } = useAuth(); // login function updates the auth context
    const [upgrading, setUpgrading] = useState(null);

    const currentPlanName = user?.plan || 'Basic';

    const handleUpgrade = async (planName) => {
        if (planName === currentPlanName) return;
        
        setUpgrading(planName);
        try {
            const { data } = await api.put('/api/auth/subscription', { plan: planName });
            // The API returns the updated user object. Update the context session!
            login(data, localStorage.getItem('token'));
        } catch (error) {
            console.error("Failed to upgrade plan:", error);
            alert("Upgrade failed. Please try again.");
        } finally {
            setUpgrading(null);
        }
    };

    const plans = [
        {
            name: 'Basic',
            price: '$0',
            features: ['Unlimited 1:1 meetings', '40 min group meetings', 'HD Video', 'Screen Sharing'],
            isCurrent: currentPlanName === 'Basic',
            color: '#94a3b8'
        },
        {
            name: 'Personal',
            price: '$12',
            features: ['Unlimited group meetings', 'Cloud Recording', 'AI Summaries', 'Advanced Security', 'Custom Branding'],
            isCurrent: currentPlanName === 'Personal',
            isPopular: true,
            color: '#6366f1'
        },
        {
            name: 'Business',
            price: '$25',
            features: ['SSO & Active Directory', 'Admin Dashboard', 'White-labeling', 'Dedicated Support', '24/7 Priority'],
            isCurrent: currentPlanName === 'Business',
            color: '#1e293b'
        }
    ];

    return (
        <div className="menu-page subscription-page">
            <div className="page-header-row">
                <h1>My Subscription</h1>
                <div className="active-badge">Active Plan: {currentPlanName}</div>
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
                        <button 
                            className={`plan-btn ${plan.isCurrent ? 'disabled' : ''}`}
                            onClick={() => handleUpgrade(plan.name)}
                            disabled={plan.isCurrent || upgrading === plan.name}
                        >
                            {plan.isCurrent 
                                ? 'Current Plan' 
                                : upgrading === plan.name 
                                    ? 'Upgrading...' 
                                    : 'Upgrade Now'
                            }
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
