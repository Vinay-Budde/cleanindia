import { useState, useEffect } from 'react';
import { Shield, Map, Clock, AlertTriangle, CheckCircle, BarChart3, Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

export default function OfficerDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Get user info
                const me = await api.get('/api/users/me');
                setUser(me);

                // For officers, we could filter stats by their municipality/zone/ward.
                // For simplicity, we just fetch overall stats and assume the backend filters if needed (or we just show overall)
                const statsData = await api.get('/api/analytics/stats');
                setStats(statsData);
            } catch (error: any) {
                toast.error(error.message || 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
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

    const roleFormat = user?.role?.replace(/_/g, ' ').toUpperCase() || 'OFFICER';

    return (
        <Layout type="admin">
            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                <div className="mb-8 bg-gradient-to-r from-teal-900 to-teal-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500 rounded-full opacity-10 -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-teal-100 text-xs font-bold tracking-wider mb-4 border border-white/20">
                            <Shield className="w-3 h-3" /> {roleFormat} PORTAL
                        </div>
                        <h1 className="text-3xl font-extrabold mb-2">Welcome back, {user?.name}</h1>
                        <p className="text-teal-100/80 text-lg">Manage complaints and monitor your jurisdiction.</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Issues</div>
                            <div className="text-2xl font-extrabold text-gray-900">{stats?.total || 0}</div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pending</div>
                            <div className="text-2xl font-extrabold text-gray-900">
                                {(stats?.byStatus?.find((s: any) => s._id === 'submitted')?.count || 0) + 
                                 (stats?.byStatus?.find((s: any) => s._id === 'assigned')?.count || 0)}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Resolved</div>
                            <div className="text-2xl font-extrabold text-gray-900">
                                {stats?.byStatus?.find((s: any) => s._id === 'resolved')?.count || 0}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">SLA Breaches</div>
                            <div className="text-2xl font-extrabold text-red-600">
                                {stats?.slaStats?.breached || 0}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <h2 className="text-xl font-extrabold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link to="/admin/complaints" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 group-hover:scale-110 transition-transform">
                            <Map className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Manage Complaints</h3>
                            <p className="text-sm text-gray-500">View, assign, and resolve civic issues</p>
                        </div>
                    </Link>

                    {['super_admin', 'state_admin', 'commissioner'].includes(user?.role) && (
                        <Link to="/admin/invite-officer" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-1">Invite Officers</h3>
                                <p className="text-sm text-gray-500">Send invites to zone/ward officers</p>
                            </div>
                        </Link>
                    )}

                    <Link to="/admin/analytics" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700 group-hover:scale-110 transition-transform">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Analytics</h3>
                            <p className="text-sm text-gray-500">View SLA compliance and performance</p>
                        </div>
                    </Link>
                </div>
            </div>
        </Layout>
    );
}
