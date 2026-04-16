import { useState, useEffect } from 'react';
import { TrendingUp, Clock, Activity, CheckCircle, AlertCircle, Timer, Users, BarChart2, MapPin, PieChart as PieChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';

// Priority config
const PRIORITY_CONFIG = {
    critical: { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', label: 'Critical', dot: '#dc2626' },
    high:     { color: '#f97316', bg: '#fff7ed', border: '#fdba74', label: 'High',     dot: '#ea580c' },
    medium:   { color: '#eab308', bg: '#fefce8', border: '#fde047', label: 'Medium',   dot: '#ca8a04' },
    low:      { color: '#22c55e', bg: '#f0fdf4', border: '#86efac', label: 'Low',      dot: '#16a34a' },
} as const;

type Priority = keyof typeof PRIORITY_CONFIG;

// Creates a custom SVG pin marker for a given priority
const createPriorityIcon = (priority: string): L.DivIcon => {
    const cfg = PRIORITY_CONFIG[priority as Priority] || PRIORITY_CONFIG.low;
    const pulse = priority === 'critical' ? `
        <span style="
            position:absolute;top:-4px;left:-4px;
            width:28px;height:28px;
            border-radius:50%;
            background:${cfg.color};
            opacity:0.25;
            animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;
        "></span>` : '';
    const html = `
        <div style="position:relative;width:20px;height:20px;">
            ${pulse}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="20" height="30">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"
                    fill="${cfg.color}" stroke="white" stroke-width="1.5"/>
                <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
            </svg>
        </div>`;
    return L.divIcon({
        html,
        className: '',
        iconSize: [20, 30],
        iconAnchor: [10, 30],
        popupAnchor: [0, -32],
    });
};

// CSS keyframe injected once for critical pulse
if (!document.getElementById('ci-map-styles')) {
    const style = document.createElement('style');
    style.id = 'ci-map-styles';
    style.textContent = `
        @keyframes ping {
            75%,100% { transform:scale(2);opacity:0; }
        }
        .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15) !important;
            padding: 0 !important;
            overflow: hidden;
            border: none !important;
        }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip-container { margin-top: -1px; }
    `;
    document.head.appendChild(style);
}

// Heatmap Layer Component using raw Leaflet
const HeatmapLayer = ({ points }: { points: [number, number, number][] }) => {
    const map = useMap();

    useEffect(() => {
        if (!(L as any).heatLayer) return;

        const layer = (L as any).heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
        }).addTo(map);

        return () => {
            map.removeLayer(layer);
        };
    }, [map, points]);

    return null;
};


// Interface
interface ComplaintData {
    _id: string;
    complaintId: string;
    title: string;
    category: string;
    priority: string;
    location: string;
    description: string;
    status: string;
    aiScore?: number;
    assignedTo?: string;
    reportedBy?: string;
    reportedAt: string;
    resolvedAt?: string;
    latitude?: number;
    longitude?: number;
}

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        total: 0,
        resolved: 0,
        pending: 0,
        inProgress: 0,
        critical: 0,
        avgResolution: '0h',
        avgResolutionValue: '0',
        avgResolutionUnit: 'hours'
    });
    const [trendData, setTrendData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [wardData, setWardData] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers');
    const [activePriorities, setActivePriorities] = useState<Set<string>>(new Set(['critical', 'high', 'medium', 'low']));

    useEffect(() => {
        const fetchComplaints = async () => {
            setIsLoading(true);
            try {
                const data = await api.get<ComplaintData[]>('/api/complaints');

                const resolvedCount = data.filter(c => c.status === 'resolved').length;
                const pendingCount = data.filter(c => c.status === 'submitted' || c.status === 'verified').length;
                const inProgressCount = data.filter(c => c.status === 'assigned' || c.status === 'in progress').length;
                const criticalCount = data.filter(c => c.priority === 'critical').length;

                // Calculate Average Resolution Time
                let totalResolutionMs = 0;
                let resolvedWithDates = 0;

                data.forEach(c => {
                    if (c.status === 'resolved' && c.resolvedAt && c.reportedAt) {
                        const resolvedMs = new Date(c.resolvedAt).getTime();
                        const reportedMs = new Date(c.reportedAt).getTime();
                        totalResolutionMs += (resolvedMs - reportedMs);
                        resolvedWithDates++;
                    }
                });

                let avgResValue = '0';
                let avgResUnit = 'hours';
                let avgResText = '0h';

                if (resolvedWithDates > 0) {
                    const avgMs = totalResolutionMs / resolvedWithDates;
                    const avgHours = avgMs / (1000 * 60 * 60);
                    if (avgHours < 24) {
                        avgResValue = avgHours.toFixed(1);
                        avgResUnit = 'hours';
                        avgResText = `${Math.floor(avgHours)}h`;
                    } else {
                        const avgDays = avgHours / 24;
                        avgResValue = avgDays.toFixed(1);
                        avgResUnit = 'days';
                        avgResText = `${Math.floor(avgDays)}d`;
                    }
                }

                setStats({
                    total: data.length,
                    resolved: resolvedCount,
                    pending: pendingCount,
                    inProgress: inProgressCount,
                    critical: criticalCount,
                    avgResolution: avgResText,
                    avgResolutionValue: avgResValue,
                    avgResolutionUnit: avgResUnit
                });

                // --- AGGREGATE CHART DATA ---

                // 1. Monthly Trends
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthlyMap: any = {};

                // Initialize last 6 months
                const now = new Date();
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const label = months[d.getMonth()];
                    monthlyMap[label] = { name: label, total: 0, resolved: 0 };
                }

                data.forEach(c => {
                    const d = new Date(c.reportedAt);
                    const label = months[d.getMonth()];
                    if (monthlyMap[label]) {
                        monthlyMap[label].total++;
                        if (c.status === 'resolved') monthlyMap[label].resolved++;
                    }
                });
                setTrendData(Object.values(monthlyMap));

                // 2. Category Distribution
                const catMap: any = {};
                const colors = ['#166534', '#a855f7', '#eab308', '#22c55e', '#0ea5e9', '#f97316'];
                data.forEach(c => {
                    catMap[c.category] = (catMap[c.category] || 0) + 1;
                });
                setCategoryData(Object.entries(catMap).map(([name, value], i) => ({
                    name,
                    value,
                    color: colors[i % colors.length]
                })));

                // 3. Ward Data (Heuristic: use top 6 locations)
                const locMap: any = {};
                data.forEach(c => {
                    // Try to extract Ward number or just use location
                    const match = c.location.match(/Ward\s*(\d+)/i);
                    const key = match ? `Ward ${match[1]}` : c.location;
                    locMap[key] = (locMap[key] || 0) + 1;
                });
                setWardData(Object.entries(locMap)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([name, issues]) => ({ name, issues })));

                setComplaints(data);

            } catch (error: any) {
                console.error('Failed to fetch complaints:', error);
                toast.error(error.message || 'Failed to load dashboard metrics');
            } finally {
                setIsLoading(false);
            }
        };

        fetchComplaints();
    }, []);
    return (
        <Layout type="admin">
            <div className="max-w-7xl mx-auto px-6 py-8 w-full">
                {/* Header title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#115e59] mb-1">Admin Dashboard</h1>
                    <p className="text-gray-500">Municipal Corporation - Complaint Management Overview</p>
                </div>

                {/* KPI Cards */}
                <div className="space-y-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Avg Resolution */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Avg. Resolution</p>
                                <h2 className="text-3xl font-bold text-gray-900 mb-1">
                                    {isLoading ? <Skeleton width={60} height={32} /> : stats.avgResolution}
                                </h2>
                                <p className="text-xs text-green-600 flex items-center gap-1 font-medium bg-green-50 w-fit px-2 py-0.5 rounded-full mt-2">
                                    <TrendingUp className="w-3 h-3" /> Real-time Based
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center">
                                <Timer className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>

                        {/* Pending */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border-l-[3px] border-l-orange-500 border border-t-gray-100 border-r-gray-100 border-b-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Pending</p>
                                <h2 className="text-3xl font-bold text-[#ea580c] mb-1">
                                    {isLoading ? <Skeleton width={40} height={32} /> : stats.pending}
                                </h2>
                                <p className="text-xs text-[#ea580c] font-medium">Needs attention</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>

                        {/* In Progress */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border-l-[3px] border-l-purple-500 border border-t-gray-100 border-r-gray-100 border-b-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">In Progress</p>
                                <h2 className="text-3xl font-bold text-purple-600 mb-1">
                                    {isLoading ? <Skeleton width={40} height={32} /> : stats.inProgress}
                                </h2>
                                <p className="text-xs text-purple-500 font-medium">Active assignments</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center">
                                <Activity className="w-6 h-6" />
                            </div>
                        </div>

                        {/* Resolved */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border-l-[3px] border-l-green-500 border border-t-gray-100 border-r-gray-100 border-b-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Resolved</p>
                                <h2 className="text-3xl font-bold text-green-600 mb-1">
                                    {isLoading ? <Skeleton width={40} height={32} /> : stats.resolved}
                                </h2>
                                <p className="text-xs text-green-600 font-medium">↑ 8% resolution rate</p>
                            </div>
                            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Critical Issues */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Critical Issues</p>
                                <h2 className="text-2xl font-bold text-gray-900">{stats.critical}</h2>
                            </div>
                        </div>

                        {/* Avg Resolution */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                                <Timer className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Avg Resolution Time</p>
                                <h2 className="text-2xl font-bold text-gray-900">{stats.avgResolutionValue} <span className="text-base font-normal">{stats.avgResolutionUnit}</span></h2>
                            </div>
                        </div>

                        {/* Active Citizens */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Active Citizens</p>
                                <h2 className="text-2xl font-bold text-gray-900">2,845</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-1">Monthly Complaint Trend</h3>
                        <p className="text-sm text-gray-500 mb-6">Complaints vs Resolved (Last 7 months)</p>
                        <div className="h-[300px] w-full">
                            {isLoading ? (
                                <Skeleton width="100%" height="100%" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                        <Line type="monotone" dataKey="total" name="Total Complaints" stroke="#115e59" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-1">Category Distribution</h3>
                        <p className="text-sm text-gray-500 mb-6">Complaints by type</p>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            {isLoading ? (
                                <Skeleton width="100%" height="100%" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={100}
                                            innerRadius={0}
                                            dataKey="value"
                                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {categoryData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ward-wise Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
                    <h3 className="font-bold text-gray-900 mb-1">Ward-wise Issue Distribution</h3>
                    <p className="text-sm text-gray-500 mb-6">Top 6 wards with most complaints</p>
                    <div className="h-[300px] w-full">
                        {isLoading ? (
                            <Skeleton width="100%" height="100%" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={wardData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <RechartsTooltip
                                        cursor={{ fill: '#F3F4F6' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                    <Bar dataKey="issues" name="Total Issues" fill="#166534" radius={[4, 4, 0, 0]} barSize={60} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
                    {/* Map Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Geospatial Issue Analytics</h3>
                            <p className="text-sm text-gray-500">Live visualization of complaints across the city by priority</p>
                        </div>
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                            <button
                                onClick={() => setViewMode('markers')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'markers' ? 'bg-white text-[#115e59] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Markers
                            </button>
                            <button
                                onClick={() => setViewMode('heatmap')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'heatmap' ? 'bg-white text-[#115e59] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Heatmap
                            </button>
                        </div>
                    </div>

                    {/* Priority filter chips + per-priority counts */}
                    {viewMode === 'markers' && (
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="text-xs font-semibold text-gray-500 mr-1">Filter by priority:</span>
                            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                                const cfg = PRIORITY_CONFIG[p];
                                const count = complaints.filter((c: any) => c.priority === p && c.latitude && c.longitude).length;
                                const active = activePriorities.has(p);
                                return (
                                    <button
                                        key={p}
                                        onClick={() => {
                                            setActivePriorities(prev => {
                                                const next = new Set(prev);
                                                if (next.has(p)) { next.delete(p); } else { next.add(p); }
                                                return next;
                                            });
                                        }}
                                        style={active ? { background: cfg.bg, borderColor: cfg.border, color: cfg.color } : {}}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                            active ? 'opacity-100' : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'
                                        }`}
                                    >
                                        <span style={{ background: active ? cfg.dot : '#9ca3af' }} className="w-2 h-2 rounded-full inline-block"></span>
                                        {cfg.label}
                                        <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            active ? 'bg-white bg-opacity-70' : 'bg-gray-100'
                                        }`}>{count}</span>
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setActivePriorities(new Set(['critical', 'high', 'medium', 'low']))}
                                className="ml-auto text-xs text-[#115e59] font-medium hover:underline"
                            >Show all</button>
                        </div>
                    )}

                    {/* Map */}
                    <div className="h-[480px] w-full rounded-xl overflow-hidden border border-gray-100 relative" style={{ zIndex: 0 }}>
                        {isLoading ? (
                            <Skeleton width="100%" height="100%" />
                        ) : (
                            <MapContainer
                                center={[20.5937, 78.9629]}
                                zoom={5}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={true}
                            >
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                                    maxZoom={19}
                                />

                                {viewMode === 'markers' ? (
                                    <MarkerClusterGroup
                                        chunkedLoading
                                        showCoverageOnHover={false}
                                        maxClusterRadius={50}
                                    >
                                        {complaints
                                            .filter((c: any) => c.latitude && c.longitude && activePriorities.has(c.priority))
                                            .map((c: any) => {
                                                const cfg = PRIORITY_CONFIG[c.priority as Priority] || PRIORITY_CONFIG.low;
                                                const statusColors: Record<string, string> = {
                                                    submitted: '#6b7280',
                                                    verified: '#3b82f6',
                                                    assigned: '#8b5cf6',
                                                    'in progress': '#f97316',
                                                    resolved: '#22c55e',
                                                };
                                                const statusColor = statusColors[c.status] || '#6b7280';
                                                const date = new Date(c.reportedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                                return (
                                                    <Marker
                                                        key={c._id}
                                                        position={[c.latitude, c.longitude]}
                                                        icon={createPriorityIcon(c.priority)}
                                                    >
                                                        <Popup minWidth={240} maxWidth={280}>
                                                            <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 240 }}>
                                                                {/* Popup header strip */}
                                                                <div style={{ background: cfg.color, padding: '10px 14px 8px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                        <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                            {cfg.label} Priority
                                                                        </span>
                                                                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9 }}>{c.complaintId}</span>
                                                                    </div>
                                                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{c.title}</div>
                                                                </div>
                                                                {/* Popup body */}
                                                                <div style={{ padding: '10px 14px 12px', background: '#fff' }}>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 8 }}>
                                                                        <div>
                                                                            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 1 }}>Category</div>
                                                                            <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{c.category}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 1 }}>Status</div>
                                                                            <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: 'capitalize' }}>{c.status}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 1 }}>Location</div>
                                                                            <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{c.location}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 1 }}>Reported</div>
                                                                            <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{date}</div>
                                                                        </div>
                                                                    </div>
                                                                    {c.reportedBy && (
                                                                        <div style={{ fontSize: 10, color: '#6b7280', borderTop: '1px solid #f3f4f6', paddingTop: 6 }}>
                                                                            Reported by <span style={{ fontWeight: 600, color: '#374151' }}>{c.reportedBy}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </Popup>
                                                    </Marker>
                                                );
                                            })
                                        }
                                    </MarkerClusterGroup>
                                ) : (
                                    <HeatmapLayer
                                        points={complaints.filter((c: any) => c.latitude && c.longitude).map((c: any) => [
                                            c.latitude,
                                            c.longitude,
                                            c.priority === 'critical' ? 1.0 : c.priority === 'high' ? 0.75 : c.priority === 'medium' ? 0.5 : 0.3
                                        ])}
                                    />
                                )}

                                {/* Map Legend Overlay */}
                                {viewMode === 'markers' && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: 28,
                                            left: 12,
                                            zIndex: 1000,
                                            background: 'rgba(255,255,255,0.95)',
                                            backdropFilter: 'blur(8px)',
                                            borderRadius: 10,
                                            padding: '8px 12px',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                            border: '1px solid #e5e7eb',
                                            minWidth: 110,
                                        }}
                                    >
                                        <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Priority</div>
                                        {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => (
                                            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_CONFIG[p].color, display: 'inline-block', flexShrink: 0 }}></span>
                                                <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{PRIORITY_CONFIG[p].label}</span>
                                                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af', fontWeight: 700 }}>
                                                    {complaints.filter((c: any) => c.priority === p && c.latitude && c.longitude).length}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </MapContainer>
                        )}
                    </div>

                    {/* No coords notice */}
                    {!isLoading && complaints.filter((c: any) => !c.latitude || !c.longitude).length > 0 && (
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {complaints.filter((c: any) => !c.latitude || !c.longitude).length} complaint(s) have no GPS coordinates and are not shown on the map.
                        </p>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <button className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:border-emerald-500 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <BarChart2 className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">Generate Report</h3>
                        <p className="text-xs text-gray-500">Export analytics</p>
                    </button>

                    <button className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:border-emerald-500 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-500 group-hover:text-white transition-colors">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">Map View</h3>
                        <p className="text-xs text-gray-500">View heatmap</p>
                    </button>

                    <button className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:border-emerald-500 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                            <Users className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">Team Management</h3>
                        <p className="text-xs text-gray-500">Assign workers</p>
                    </button>

                    <button className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:border-emerald-500 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                            <PieChartIcon className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">SLA Tracking</h3>
                        <p className="text-xs text-gray-500">Monitor timelines</p>
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default AdminDashboard;
