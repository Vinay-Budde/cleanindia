import { useState, useEffect } from 'react';
import { TrendingUp, Users, Award, Lightbulb, BarChart3, Loader2, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const TREND_COLORS: Record<string, string> = {
    increasing: '#ef4444',
    normal: '#10b981',
    decreasing: '#3b82f6'
};

export default function PredictiveAnalytics() {
    const [predictive, setPredictive] = useState<any>(null);
    const [officerPerf, setOfficerPerf] = useState<any[]>([]);
    const [wardRecs, setWardRecs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'predictive' | 'officers' | 'wards'>('predictive');

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [pred, officers, wards] = await Promise.all([
                    api.get('/api/analytics/predictive'),
                    api.get('/api/analytics/officer-performance'),
                    api.get('/api/analytics/ward-recommendations'),
                ]);
                setPredictive(pred);
                setOfficerPerf((officers as any[]).slice(0, 20));
                setWardRecs(wards as any[]);
            } catch (e: any) {
                toast.error('Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) return (
        <Layout type="admin">
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 style={{ width: 48, height: 48, color: '#115e59', animation: 'spin 1s linear infinite' }} />
            </div>
        </Layout>
    );

    const TABS = [
        { key: 'predictive', label: 'Predictive Analytics', icon: TrendingUp },
        { key: 'officers', label: 'Officer Performance', icon: Award },
        { key: 'wards', label: 'Smart Recommendations', icon: Lightbulb },
    ] as const;

    return (
        <Layout type="admin">
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)', padding: '40px 32px 80px', color: 'white' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: '#c7d2fe', marginBottom: 20 }}>
                        <BarChart3 style={{ width: 14, height: 14 }} /> AI-Powered Intelligence
                    </div>
                    <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>Predictive Analytics</h1>
                    <p style={{ color: 'rgba(199,210,254,0.8)', fontSize: 16 }}>Forecast complaint trends, track officer performance, and get smart recommendations</p>
                </div>
            </div>

            <div style={{ maxWidth: 1200, margin: '-40px auto 0', padding: '0 32px 48px' }}>
                {/* Tabs */}
                <div style={{ background: 'white', borderRadius: 16, padding: 8, display: 'flex', gap: 4, marginBottom: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                                    background: isActive ? 'linear-gradient(135deg,#312e81,#4338ca)' : 'transparent',
                                    color: isActive ? 'white' : '#6b7280', fontWeight: 700, fontSize: 14,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Icon style={{ width: 16, height: 16 }} />{tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Predictive Tab */}
                {activeTab === 'predictive' && predictive && (
                    <div>
                        {/* Category Distribution */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                            <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                                <h3 style={{ fontWeight: 800, color: '#111827', marginBottom: 20, fontSize: 16 }}>Category Distribution</h3>
                                <div style={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={predictive.categoryTotals?.slice(0,8)} layout="vertical" margin={{ left: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} width={100} />
                                            <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="total" fill="#4338ca" radius={[0,6,6,0]} barSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                                <h3 style={{ fontWeight: 800, color: '#111827', marginBottom: 20, fontSize: 16 }}>This Month's Forecast</h3>
                                {predictive.predictions?.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, color: '#9ca3af' }}>
                                        <TrendingUp style={{ width: 48, height: 48, opacity: 0.3, marginBottom: 12 }} />
                                        <div style={{ fontWeight: 600 }}>Not enough data yet for predictions</div>
                                        <div style={{ fontSize: 13, marginTop: 8 }}>Add more complaints to generate forecasts</div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {predictive.predictions?.map((p: any, i: number) => (
                                            <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: TREND_COLORS[p.trend] + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <TrendingUp style={{ width: 18, height: 18, color: TREND_COLORS[p.trend] }} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{p.category}</div>
                                                    <div style={{ fontSize: 12, color: '#6b7280' }}>Expected: {p.expectedComplaints} complaints</div>
                                                </div>
                                                <span style={{ background: TREND_COLORS[p.trend] + '20', color: TREND_COLORS[p.trend], padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                                                    {p.trend.toUpperCase()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recommendations from predictions */}
                        {predictive.predictions?.length > 0 && (
                            <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', borderRadius: 20, padding: 24, border: '1px solid #bae6fd' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                    <Lightbulb style={{ width: 24, height: 24, color: '#0284c7' }} />
                                    <h3 style={{ fontWeight: 800, color: '#0c4a6e', fontSize: 16, margin: 0 }}>AI Deployment Recommendations</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
                                    {predictive.predictions?.map((p: any, i: number) => (
                                        <div key={i} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                            <div style={{ fontWeight: 700, color: '#0c4a6e', fontSize: 13, marginBottom: 4 }}>📌 {p.category}</div>
                                            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{p.recommendation}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Officer Performance Tab */}
                {activeTab === 'officers' && (
                    <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Award style={{ width: 20, height: 20, color: '#4338ca' }} />
                            <h3 style={{ fontWeight: 800, color: '#111827', margin: 0, fontSize: 16 }}>Officer Performance Rankings</h3>
                        </div>
                        {officerPerf.length === 0 ? (
                            <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af' }}>
                                <Users style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }} />
                                <div style={{ fontWeight: 700, fontSize: 16 }}>No officer performance data yet</div>
                                <div style={{ fontSize: 14, marginTop: 8 }}>Performance data will appear once officers are assigned complaints</div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                                            <th style={{ padding: '14px 20px', fontWeight: 700 }}>Rank</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 700 }}>Officer</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 700 }}>Total</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 700 }}>Resolved</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 700 }}>Resolution Rate</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 700 }}>SLA Compliance</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 700 }}>Avg Rating</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 700 }}>Performance Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {officerPerf.map((o: any, idx: number) => {
                                            const score = Math.round(o.performanceScore || 0);
                                            const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
                                            return (
                                                <tr key={idx} style={{ borderTop: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: idx < 3 ? ['#fbbf24','#d1d5db','#cd7c2b'][idx] : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: idx < 3 ? 'white' : '#6b7280' }}>
                                                            {idx + 1}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ fontWeight: 700, color: '#111827' }}>{o.officer?.name || 'Unknown'}</div>
                                                        <div style={{ fontSize: 12, color: '#9ca3af' }}>{o.officer?.role?.replace(/_/g, ' ')}</div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#374151' }}>{o.total}</td>
                                                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#16a34a' }}>{o.resolved}</td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${Math.min(o.resolutionRate || 0, 100)}%`, background: '#16a34a', borderRadius: 99 }} />
                                                            </div>
                                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', minWidth: 36 }}>{Math.round(o.resolutionRate || 0)}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${Math.min(o.slaCompliance || 0, 100)}%`, background: '#4338ca', borderRadius: 99 }} />
                                                            </div>
                                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', minWidth: 36 }}>{Math.round(o.slaCompliance || 0)}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        {o.avgRating ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <span style={{ color: '#fbbf24' }}>★</span>
                                                                <span style={{ fontWeight: 700, color: '#374151' }}>{o.avgRating.toFixed(1)}</span>
                                                            </div>
                                                        ) : <span style={{ color: '#9ca3af', fontSize: 13 }}>N/A</span>}
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: scoreColor + '15', color: scoreColor, padding: '6px 14px', borderRadius: 99 }}>
                                                            <span style={{ fontWeight: 900, fontSize: 16 }}>{score}</span>
                                                            <span style={{ fontSize: 11, fontWeight: 600 }}>/100</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Ward Recommendations Tab */}
                {activeTab === 'wards' && (
                    <div>
                        {wardRecs.length === 0 ? (
                            <div style={{ background: 'white', borderRadius: 20, padding: 80, textAlign: 'center', color: '#9ca3af', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                                <Lightbulb style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }} />
                                <div style={{ fontWeight: 700, fontSize: 16 }}>No ward-level data yet</div>
                                <div style={{ fontSize: 14, marginTop: 8 }}>Recommendations appear once complaints are assigned to wards</div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
                                {wardRecs.map((ward: any, i: number) => (
                                    <div key={i} style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <MapPin style={{ width: 22, height: 22, color: '#0284c7' }} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, color: '#111827', fontSize: 16 }}>{ward.wardName}</div>
                                                <div style={{ fontSize: 13, color: '#6b7280' }}>{ward.totalComplaints} total complaints</div>
                                            </div>
                                        </div>
                                        
                                        {/* Top categories */}
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Top Issues</div>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {ward.topCategories?.map((cat: any, j: number) => (
                                                    <span key={j} style={{ background: '#f3f4f6', color: '#374151', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                                                        {cat.category} ({cat.count})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Recommendations */}
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Recommendations</div>
                                            {ward.recommendations?.map((rec: string, j: number) => (
                                                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, padding: '10px 12px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                                                    <span style={{ fontSize: 14 }}>💡</span>
                                                    <span style={{ fontSize: 13, color: '#065f46', fontWeight: 500, lineHeight: 1.4 }}>{rec}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
