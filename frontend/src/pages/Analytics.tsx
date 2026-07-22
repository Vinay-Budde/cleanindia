import { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, 
    LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, BarChart3, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const COLORS = ['#115e59', '#0f766e', '#14b8a6', '#5eead4', '#ccfbf1', '#f97316', '#ef4444', '#3b82f6'];

export default function Analytics() {
    const [stats, setStats] = useState<any>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [municipalities, setMunicipalities] = useState<any[]>([]);
    const [resolutionTime, setResolutionTime] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [statsData, trendsData, mcData, resTimeData] = await Promise.all([
                    api.get('/api/analytics/stats'),
                    api.get('/api/analytics/trends'),
                    api.get('/api/analytics/municipalities'),
                    api.get('/api/analytics/resolution-time')
                ]);
                
                setStats(statsData);
                
                // Format trends for chart
                const formattedTrends = trendsData.map((t: any) => {
                    const date = new Date(t._id.year, t._id.month - 1);
                    return {
                        month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
                        total: t.total,
                        resolved: t.resolved,
                        breached: t.slaBreached
                    };
                }).reverse();
                setTrends(formattedTrends);
                
                setMunicipalities(mcData);
                setResolutionTime(resTimeData);
            } catch (error: any) {
                toast.error(error.message || 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <Layout type="admin">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <Loader2 style={{ width: 40, height: 40, color: '#115e59', animation: 'spin 1s linear infinite' }} />
                </div>
            </Layout>
        );
    }

    if (!stats) return null;

    // Formatting data for Pie Charts
    const statusData = stats.byStatus.map((s: any) => ({ name: s._id.replace(/_/g, ' ').toUpperCase(), value: s.count }));
    const priorityData = stats.byPriority.map((s: any) => ({ name: s._id.toUpperCase(), value: s.count }));

    return (
        <Layout type="admin">
            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Civic Analytics Platform</h1>
                        <p style={{ color: '#6b7280', fontSize: 15 }}>Monitor city-wide performance and SLA compliance</p>
                    </div>
                </div>

                {/* Top KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BarChart3 style={{ color: '#16a34a', width: 24, height: 24 }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Complaints</div>
                        <div style={{ fontSize: 36, fontWeight: 800, color: '#111827', marginTop: 4 }}>{stats.total.toLocaleString()}</div>
                    </div>

                    <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle style={{ color: '#2563eb', width: 24, height: 24 }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved</div>
                        <div style={{ fontSize: 36, fontWeight: 800, color: '#111827', marginTop: 4 }}>
                            {stats.byStatus.find((s: any) => s._id === 'resolved')?.count || 0}
                        </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AlertTriangle style={{ color: '#dc2626', width: 24, height: 24 }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SLA Breaches</div>
                        <div style={{ fontSize: 36, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                            {stats.slaStats.breached || 0}
                        </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TrendingUp style={{ color: '#d97706', width: 24, height: 24 }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SLA Compliance</div>
                        <div style={{ fontSize: 36, fontWeight: 800, color: '#111827', marginTop: 4 }}>
                            {stats.slaStats.totalSLA ? Math.round(((stats.slaStats.totalSLA - (stats.slaStats.breached || 0)) / stats.slaStats.totalSLA) * 100) : 100}%
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Monthly Trends */}
                    <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Monthly Trends</h3>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trends} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                                    <Line type="monotone" name="Total Reported" dataKey="total" stroke="#115e59" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" name="Resolved" dataKey="resolved" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                                    <Line type="monotone" name="SLA Breached" dataKey="breached" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Resolution Time */}
                    <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Avg. Resolution Time (Hours)</h3>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={resolutionTime} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <YAxis type="category" dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }} width={120} />
                                    <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="avgHours" name="Hours" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Pie */}
                    <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Complaints by Status</h3>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value">
                                        {statusData.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Priority Pie */}
                    <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Complaints by Priority</h3>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value">
                                        {priorityData.map((entry: any, index: number) => {
                                            const colors = { EMERGENCY: '#dc2626', CRITICAL: '#ea580c', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#10b981' };
                                            return <Cell key={`cell-${index}`} fill={(colors as any)[entry.name] || COLORS[index % COLORS.length]} />;
                                        })}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Performance Table */}
                <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                    <div style={{ padding: 24, borderBottom: '1px solid #f3f4f6' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>Municipal Corporation Performance</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                                    <th style={{ padding: '16px 24px', fontWeight: 700 }}>Municipality</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 700 }}>Total</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 700 }}>Resolved</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 700 }}>Pending</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 700 }}>SLA Breaches</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 700 }}>Avg Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {municipalities.map((mc, idx) => (
                                    <tr key={idx} style={{ borderTop: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontWeight: 600, color: '#111827' }}>{mc.name || 'Unassigned'}</div>
                                            {mc.district && <div style={{ fontSize: 12, color: '#6b7280' }}>{mc.district}, {mc.state}</div>}
                                        </td>
                                        <td style={{ padding: '16px 24px', fontWeight: 600, color: '#374151' }}>{mc.total}</td>
                                        <td style={{ padding: '16px 24px', color: '#10b981', fontWeight: 600 }}>{mc.resolved}</td>
                                        <td style={{ padding: '16px 24px', color: '#f59e0b', fontWeight: 600 }}>{mc.pending}</td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ background: mc.slaBreached > 0 ? '#fef2f2' : '#f0fdf4', color: mc.slaBreached > 0 ? '#dc2626' : '#16a34a', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                                                {mc.slaBreached}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            {mc.avgRating ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                                    <span style={{ color: '#eab308' }}>★</span>
                                                    {mc.avgRating.toFixed(1)}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#9ca3af', fontSize: 13 }}>No ratings</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
