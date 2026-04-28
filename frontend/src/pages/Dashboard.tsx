import { useState, useEffect, useRef } from 'react';
import { Plus, TrendingUp, CheckCircle, AlertTriangle, Clock, ArrowRight, MapPin, Zap, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createIcon = (color: string) => {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });
};

const blueIcon = createIcon('blue');
const greenIcon = createIcon('green');
const orangeIcon = createIcon('orange');

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
    imageUrl?: string;
    assignedTo?: string;
    latitude?: number | string;
    longitude?: number | string;
    reportedAt: string;
    resolvedAt?: string;
}

const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${normalizedUrl}`;
};

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    submitted:   { label: 'Submitted',   color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
    verified:    { label: 'Verified',    color: '#2563eb', bg: '#eff6ff', dot: '#3b82f6' },
    assigned:    { label: 'Assigned',    color: '#7c3aed', bg: '#f5f3ff', dot: '#8b5cf6' },
    'in progress': { label: 'In Progress', color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' },
    resolved:    { label: 'Resolved',    color: '#059669', bg: '#ecfdf5', dot: '#10b981' },
};

// Animated counter hook
const useCounter = (target: number, duration = 1200) => {
    const [count, setCount] = useState(0);
    const startRef = useRef<number | null>(null);

    useEffect(() => {
        if (target === 0) { setCount(0); return; }
        startRef.current = null;
        const step = (timestamp: number) => {
            if (!startRef.current) startRef.current = timestamp;
            const progress = Math.min((timestamp - startRef.current) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration]);

    return count;
};

const AnimatedStat = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
    const count = useCounter(value);
    return <>{count}{suffix}</>;
};

const Dashboard = () => {
    const [complaints, setComplaints] = useState<ComplaintData[]>([]);
    const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0, avgResolution: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const userName = localStorage.getItem('userName') || 'Citizen';

    useEffect(() => {
        const fetchComplaints = async () => {
            setIsLoading(true);
            try {
                const data = await api.get<ComplaintData[]>('/api/complaints');
                setComplaints(data);

                const resolvedCount = data.filter(c => c.status === 'resolved').length;
                const pendingCount = data.filter(c =>
                    ['submitted', 'verified', 'assigned', 'in progress'].includes(c.status)
                ).length;

                let totalResolutionMs = 0;
                let resolvedWithDates = 0;
                data.forEach(c => {
                    if (c.status === 'resolved' && c.resolvedAt && c.reportedAt) {
                        totalResolutionMs += new Date(c.resolvedAt).getTime() - new Date(c.reportedAt).getTime();
                        resolvedWithDates++;
                    }
                });

                const avgDays = resolvedWithDates > 0
                    ? parseFloat((totalResolutionMs / resolvedWithDates / (1000 * 60 * 60 * 24)).toFixed(1))
                    : 0;

                setStats({ total: data.length, resolved: resolvedCount, pending: pendingCount, avgResolution: avgDays });
            } catch (error: any) {
                toast.error(error.message || 'Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
        };
        fetchComplaints();
    }, []);

    const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
    const circumference = 2 * Math.PI * 40;
    const dashOffset = circumference - (resolutionRate / 100) * circumference;

    const kpiCards = [
        {
            label: 'Total Reports',
            value: stats.total,
            suffix: '',
            icon: BarChart3,
            iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            accent: '#667eea',
            lightBg: '#f0f0ff',
        },
        {
            label: 'Resolved',
            value: stats.resolved,
            suffix: '',
            icon: CheckCircle,
            iconBg: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
            accent: '#0ba360',
            lightBg: '#edfdf6',
        },
        {
            label: 'Pending',
            value: stats.pending,
            suffix: '',
            icon: AlertTriangle,
            iconBg: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
            accent: '#f7971e',
            lightBg: '#fffcf0',
        },
        {
            label: 'Avg. Resolution',
            value: stats.avgResolution,
            suffix: 'd',
            icon: Clock,
            iconBg: 'linear-gradient(135deg, #f953c6 0%, #b91d73 100%)',
            accent: '#f953c6',
            lightBg: '#fff0fb',
        },
    ];

    return (
        <Layout>
            {/* ── Hero ──────────────────────────────────────────────── */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #0f4c3a 0%, #115e59 40%, #0d9488 80%, #14b8a6 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
                className="text-white pt-14 pb-28 px-6 md:px-12 w-full"
            >
                {/* decorative blobs */}
                <div style={{
                    position: 'absolute', top: '-80px', right: '-80px',
                    width: '320px', height: '320px',
                    borderRadius: '50%',
                    background: 'rgba(20, 184, 166, 0.15)',
                    filter: 'blur(60px)',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-60px', left: '30%',
                    width: '240px', height: '240px',
                    borderRadius: '50%',
                    background: 'rgba(103, 232, 249, 0.12)',
                    filter: 'blur(50px)',
                }} />

                <div className="max-w-7xl mx-auto relative">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-100 mb-6">
                        <Zap className="w-3.5 h-3.5 text-yellow-300" />
                        Smart Civic Management Platform
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-3 leading-tight">
                        Welcome back, <span style={{ color: '#a7f3d0' }}>{userName.split(' ')[0]}</span>
                    </h1>
                    <p className="text-lg text-emerald-100/80 mb-8 max-w-xl leading-relaxed">
                        Report civic issues, track resolutions, and help build a cleaner, smarter India.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/report"
                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
                            style={{
                                background: 'white',
                                color: '#115e59',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            <Plus className="w-4 h-4" />
                            Report New Issue
                        </Link>
                        <Link
                            to="/complaints"
                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                borderColor: 'rgba(255,255,255,0.3)',
                                color: 'white',
                                backdropFilter: 'blur(8px)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                        >
                            View My Complaints
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards (overlap hero) ───────────────────────────── */}
            <div className="max-w-7xl mx-auto px-6 -mt-14 relative z-10 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {kpiCards.map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={i}
                                className="bg-white rounded-2xl p-6 flex items-center gap-4"
                                style={{
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                                    border: '1px solid rgba(255,255,255,0.8)',
                                }}
                            >
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: card.iconBg, boxShadow: `0 6px 16px ${card.accent}40` }}
                                >
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                        {card.label}
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {isLoading
                                            ? <Skeleton width={48} height={32} />
                                            : <AnimatedStat value={card.value} suffix={card.suffix} />
                                        }
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Main Content Row ──────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

                    {/* Map Card */}
                    <div
                        className="lg:col-span-2 bg-white rounded-2xl overflow-hidden"
                        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}
                    >
                        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base">Issue Map</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Live complaints near your area</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                                {[
                                    { color: '#22c55e', label: 'Resolved' },
                                    { color: '#f97316', label: 'Critical' },
                                    { color: '#3b82f6', label: 'Active' },
                                ].map(item => (
                                    <span key={item.label} className="flex items-center gap-1.5 text-gray-500 font-medium">
                                        <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                                        {item.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="h-[380px] relative z-0">
                            <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                                />
                                <MarkerClusterGroup chunkedLoading maxClusterRadius={50} showCoverageOnHover={false}>
                                    {complaints.filter(c => c.latitude && c.longitude).map(complaint => (
                                        <Marker
                                            key={complaint._id}
                                            position={[Number(complaint.latitude), Number(complaint.longitude)]}
                                            icon={
                                                complaint.status === 'resolved' ? greenIcon :
                                                    complaint.priority === 'critical' ? orangeIcon : blueIcon
                                            }
                                        >
                                            <Popup>
                                                <div style={{ fontFamily: 'system-ui', minWidth: 180 }}>
                                                    <div style={{
                                                        background: complaint.status === 'resolved' ? '#10b981' : '#115e59',
                                                        color: '#fff', padding: '8px 12px', margin: '-8px -12px 8px',
                                                        borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: 13,
                                                    }}>
                                                        {complaint.title}
                                                    </div>
                                                    <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{complaint.location}</p>
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                                                        borderRadius: 99, background: statusConfig[complaint.status]?.bg || '#f3f4f6',
                                                        color: statusConfig[complaint.status]?.color || '#6b7280',
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        {complaint.status}
                                                    </span>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MarkerClusterGroup>
                            </MapContainer>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-1 flex flex-col gap-5">

                        {/* Resolution Rate Ring */}
                        <div
                            className="bg-white rounded-2xl p-6"
                            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}
                        >
                            <h3 className="font-bold text-gray-900 text-sm mb-4">Resolution Rate</h3>
                            <div className="flex items-center gap-5">
                                <div className="relative flex-shrink-0">
                                    <svg width="96" height="96" viewBox="0 0 96 96">
                                        <circle cx="48" cy="48" r="40" fill="none" stroke="#f0fdf4" strokeWidth="10" />
                                        <circle
                                            cx="48" cy="48" r="40" fill="none"
                                            stroke="url(#greenGrad)" strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={isLoading ? circumference : dashOffset}
                                            style={{ transform: 'rotate(-90deg)', transformOrigin: '48px 48px', transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                        />
                                        <defs>
                                            <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#0ba360" />
                                                <stop offset="100%" stopColor="#3cba92" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xl font-bold text-gray-900">
                                            {isLoading ? '--' : `${resolutionRate}%`}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Resolved</p>
                                        <p className="text-lg font-bold text-emerald-600">{isLoading ? '--' : stats.resolved}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Pending</p>
                                        <p className="text-lg font-bold text-amber-500">{isLoading ? '--' : stats.pending}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Complaints Feed */}
                        <div
                            className="bg-white rounded-2xl p-6 flex-1 flex flex-col"
                            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900 text-sm">Recent Reports</h3>
                                <Link
                                    to="/complaints"
                                    className="text-xs font-semibold flex items-center gap-1"
                                    style={{ color: '#115e59' }}
                                >
                                    View all <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto">
                                {isLoading ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Skeleton width={40} height={40} className="rounded-xl flex-shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton width="75%" height={13} />
                                                <Skeleton width="50%" height={10} />
                                            </div>
                                        </div>
                                    ))
                                ) : complaints.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <MapPin className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500">No complaints yet.</p>
                                        <Link to="/report" className="text-xs text-emerald-600 font-semibold mt-1 block">
                                            Report your first issue →
                                        </Link>
                                    </div>
                                ) : (
                                    complaints.slice(0, 5).map(complaint => {
                                        const sc = statusConfig[complaint.status] || statusConfig.submitted;
                                        const img = getImageUrl(complaint.imageUrl);
                                        return (
                                            <div key={complaint._id} className="flex items-center gap-3 group">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                                                    style={{ background: img ? undefined : 'linear-gradient(135deg, #115e59, #0d9488)' }}
                                                >
                                                    {img
                                                        ? <img src={img} alt={complaint.title} className="w-full h-full object-cover" />
                                                        : complaint.category.charAt(0).toUpperCase()
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-800 truncate">{complaint.title}</p>
                                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{complaint.location}</p>
                                                </div>
                                                <span
                                                    className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                    style={{ background: sc.bg, color: sc.color }}
                                                >
                                                    {sc.label}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {!isLoading && complaints.length > 0 && (
                                <Link
                                    to="/complaints"
                                    className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all block"
                                    style={{
                                        background: 'linear-gradient(135deg, #115e59, #0d9488)',
                                        color: 'white',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                                >
                                    View All Complaints
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Quick Action Banner ──────────────────────────────── */}
                <div
                    className="rounded-2xl p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-6"
                    style={{
                        background: 'linear-gradient(135deg, #0f4c3a 0%, #115e59 50%, #0d9488 100%)',
                        boxShadow: '0 10px 40px rgba(17, 94, 89, 0.4)',
                    }}
                >
                    <div>
                        <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1">
                            Ready to make a difference?
                        </p>
                        <h3 className="text-xl font-bold text-white">Spotted a civic issue nearby?</h3>
                        <p className="text-sm text-emerald-100/70 mt-1">
                            Report it in under 60 seconds and help your community.
                        </p>
                    </div>
                    <Link
                        to="/report"
                        className="flex-shrink-0 flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm"
                        style={{ background: 'white', color: '#115e59', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <Plus className="w-4 h-4" />
                        Report Issue Now
                    </Link>
                </div>

                {/* ── Impact Stats Strip ─────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
                    {[
                        { icon: TrendingUp, label: 'Resolution Rate', value: `${resolutionRate}%`, desc: 'of issues resolved', color: '#10b981' },
                        { icon: CheckCircle, label: 'Issues Closed', value: stats.resolved.toString(), desc: 'complaints resolved', color: '#3b82f6' },
                        { icon: AlertTriangle, label: 'Pending', value: stats.pending.toString(), desc: 'awaiting action', color: '#f59e0b' },
                        { icon: Clock, label: 'Avg. Speed', value: `${stats.avgResolution}d`, desc: 'average resolution', color: '#a855f7' },
                    ].map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={i}
                                className="bg-white rounded-2xl p-5"
                                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}
                            >
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                                    style={{ background: `${item.color}15` }}
                                >
                                    <Icon className="w-4.5 h-4.5" style={{ color: item.color }} />
                                </div>
                                <p className="text-2xl font-bold text-gray-900 mb-0.5">
                                    {isLoading ? '--' : item.value}
                                </p>
                                <p className="text-xs font-medium text-gray-500">{item.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
