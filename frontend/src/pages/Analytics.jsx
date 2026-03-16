import React from 'react';
import { BarChart3, TrendingUp, Users, Clock, ArrowUpRight } from 'lucide-react';
import './MenuPages.css';

const Analytics = () => {
    const stats = [
        { label: 'Total Meetings', value: '124', trend: '+12%', icon: <BarChart3 /> },
        { label: 'Total Hours', value: '45.5', trend: '+8%', icon: <Clock /> },
        { label: 'Unique Participants', value: '892', trend: '+24%', icon: <Users /> },
        { label: 'Avg. Duration', value: '32m', trend: '-2%', icon: <TrendingUp /> },
    ];

    return (
        <div className="menu-page">
            <div className="page-header-row">
                <h1>Analytics Dashboard</h1>
                <select className="date-filter">
                    <option>Last 30 Days</option>
                    <option>Last 7 Days</option>
                    <option>Year to Date</option>
                </select>
            </div>

            <div className="analytics-overview">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card-v3">
                        <div className="stat-header">
                            <div className="stat-icon-wrap">{stat.icon}</div>
                            <span className={`trend ${stat.trend.startsWith('+') ? 'up' : 'down'}`}>
                                {stat.trend} <ArrowUpRight size={14} />
                            </span>
                        </div>
                        <div className="stat-body">
                            <span className="stat-label">{stat.label}</span>
                            <span className="stat-value">{stat.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="charts-mock-row">
                <div className="chart-card large">
                    <h3>Meeting Activity (Daily)</h3>
                    <div className="mock-bar-chart">
                        {[40, 65, 30, 85, 45, 70, 95].map((h, i) => (
                            <div key={i} className="bar-wrapper">
                                <div className="bar" style={{ height: `${h}%` }}></div>
                                <span className="bar-day">Day {i+1}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="chart-card small">
                    <h3>Device Usage</h3>
                    <div className="mock-pie-chart">
                        <div className="pie-segment desktop" style={{ '--val': 65 }}></div>
                        <div className="pie-segment mobile" style={{ '--val': 25 }}></div>
                        <div className="pie-segment tablet" style={{ '--val': 10 }}></div>
                    </div>
                    <div className="chart-legend">
                        <div className="legend-item"><div className="dot desktop"></div> Desktop (65%)</div>
                        <div className="legend-item"><div className="dot mobile"></div> Mobile (25%)</div>
                        <div className="legend-item"><div className="dot tablet"></div> Tablet (10%)</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
