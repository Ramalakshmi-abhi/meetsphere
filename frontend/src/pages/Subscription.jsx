import React, { useState } from 'react';
import { Check, Star, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './MenuPages.css';

const Subscription = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const [processing, setProcessing] = useState(false);

    const currentPlanName = user?.plan || 'Basic';

    const handleUpgradeInitiate = (plan) => {
        if (plan.name === currentPlanName) return;
        
        if (plan.name === 'Basic') {
            handleUpgrade('Basic');
        } else {
            setSelectedPlan(plan);
            setShowPayment(true);
        }
    };

    const handleUpgrade = async (planName) => {
        setProcessing(true);
        try {
            const { data } = await api.put('/api/auth/subscription', { plan: planName });
            updateUser(data);
            alert(`Success! You have been moved to the ${planName} plan.`);
            setShowPayment(false);
            setSelectedPlan(null);
        } catch (error) {
            console.error("Failed to upgrade plan:", error);
            alert("Upgrade failed. Please try again.");
        } finally {
            setProcessing(false);
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
                            onClick={() => handleUpgradeInitiate(plan)}
                            disabled={plan.isCurrent || processing}
                        >
                            {plan.isCurrent 
                                ? 'Current Plan' 
                                : processing && selectedPlan?.name === plan.name 
                                    ? 'Processing...' 
                                    : plan.name === 'Basic' ? 'Downgrade' : 'Upgrade Now'
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
                <button className="manage-billing" onClick={() => navigate('/invoices')}>Manage Billing</button>
            </div>

            {/* Payment Modal */}
            {showPayment && selectedPlan && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s' }}>
                    <div className="modal-content" style={{ background: 'white', padding: '2.5rem', borderRadius: '1.25rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Secure Checkout</h2>
                            <button onClick={() => setShowPayment(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.5rem', padding: '0' }}>&times;</button>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#64748b', fontWeight: '600' }}>Plan</span>
                                <span style={{ color: '#1e293b', fontWeight: '700' }}>{selectedPlan.name} Subscription</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#64748b', fontWeight: '600' }}>Total</span>
                                <span style={{ color: '#6366f1', fontWeight: '800', fontSize: '1.5rem' }}>{selectedPlan.price}<span style={{fontSize: '0.875rem', color: '#64748b', fontWeight: '600'}}>/mo</span></span>
                            </div>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); handleUpgrade(selectedPlan.name); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Name on Card</label>
                                <input type="text" required placeholder="John Doe" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Card Details</label>
                                <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '0.5rem', overflow: 'hidden' }}>
                                    <input type="text" required placeholder="Card number" maxLength="19" style={{ flex: 2, padding: '0.75rem 1rem', border: 'none', borderRight: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }} />
                                    <input type="text" required placeholder="MM/YY" maxLength="5" style={{ flex: 1, padding: '0.75rem 1rem', border: 'none', borderRight: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }} />
                                    <input type="text" required placeholder="CVC" maxLength="4" style={{ flex: 1, padding: '0.75rem 1rem', border: 'none', outline: 'none', fontSize: '1rem' }} />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0', color: '#64748b', fontSize: '0.875rem' }}>
                                <Shield size={16} color="#10b981" />
                                <span>Payments are securely processed by Stripe.</span>
                            </div>

                            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.125rem', fontWeight: 'bold' }} disabled={processing}>
                                {processing ? 'Processing...' : `Pay ${selectedPlan.price} & Upgrade`}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Subscription;
