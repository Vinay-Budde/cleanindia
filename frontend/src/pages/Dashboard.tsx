import { useState, useEffect } from 'react';
import { Plus, TrendingUp, CheckCircle, AlertTriangle, Users } from 'lucide-react';
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

// Custom colored icons
const createIcon = (color: string) => {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
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
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${normalizedUrl}`;
};

const Dashboard = () => {
    const [complaints, setComplaints] = useState<ComplaintData[]>([]);
    const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0, avgResolution: '0.0' });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchComplaints = async () => {
            setIsLoading(true);
            try {
                // Backend filters automatically by role:
                // - Citizens receive only their own complaints
                // - Admins receive all complaints
                const data = await api.get<ComplaintData[]>('/api/complaints');
                setComplaints(data);

                const resolvedCount = data.filter(c => c.status === 'resolved').length;
                const pendingCount = data.filter(c => ['submitted', 'verified', 'assigned', 'in progress'].includes(c.status)).length;

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

                let avgResText = '0.0';
                if (resolvedWithDates > 0) {
                    const avgMs = totalResolutionMs / resolvedWithDates;
                    const avgDays = (avgMs / (1000 * 60 * 60 * 24)).toFixed(1);
                    avgResText = avgDays;
                }

                setStats({
                    total: data.length,
                    resolved: resolvedCount,
                    pending: pendingCount,
                    avgResolution: avgResText
                });
            } catch (error: any) {
                console.error('Failed to fetch complaints:', error);
                toast.error(error.message || 'Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchComplaints();
    }, []);


    // Color mappings for UI highlights
    const priorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'critical': return 'bg-red-500';
            case 'high': return 'bg-orange-500';
            case 'medium': return 'bg-yellow-500';
            case 'low': return 'bg-green-500';
            default: return 'bg-blue-500';
        }
    };

    return (
        <Layout>
            {/* Hero Section */}
            <div className="bg-[#115e59] text-white pt-12 pb-24 px-6 md:px-12 w-full">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold mb-3">Welcome to Clean India</h1>
                    <p className="text-lg text-emerald-100 mb-8 max-w-2xl">
                        Report civic issues, track progress, and help build a cleaner, smarter India
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Link to="/report" className="bg-white text-[#115e59] px-5 py-2.5 rounded-md font-semibold text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm">
                            <Plus className="w-4 h-4" /> Report New Issue
                        </Link>
                        <Link to="/complaints" className="bg-transparent border border-emerald-400 text-white px-5 py-2.5 rounded-md font-semibold text-sm hover:bg-[#0f4d49] transition-colors inline-block text-center flex items-center justify-center">
                            View My Complaints
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-10 w-full mb-12">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Total Complaints</p>
                            <h2 className="text-3xl font-bold text-gray-900">
                                {isLoading ? <Skeleton width={40} height={32} /> : stats.total}
                            </h2>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Resolved</p>
                            <h2 className="text-3xl font-bold text-green-600">
                                {isLoading ? <Skeleton width={40} height={32} /> : stats.resolved}
                            </h2>
                        </div>
                        <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Pending/In Progress</p>
                            <h2 className="text-3xl font-bold text-[#ea580c]">
                                {isLoading ? <Skeleton width={40} height={32} /> : stats.pending}
                            </h2>
                        </div>
                        <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Avg. Resolution</p>
                            <h2 className="text-3xl font-bold text-gray-900">
                                {isLoading ? <Skeleton width={80} height={32} /> : <>{stats.avgResolution} <span className="text-lg font-medium">days</span></>}
                            </h2>
                        </div>
                        <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Map and Recent Content row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Map Column */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                            <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
                                <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />

                                    <MarkerClusterGroup
                                        chunkedLoading
                                        maxClusterRadius={50}
                                        showCoverageOnHover={false}
                                    >
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
                                                    <div className="p-1">
                                                        <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1">{complaint.title}</h4>
                                                        <p className="text-xs text-gray-500 mb-1">{complaint.location}</p>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${complaint.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {complaint.status}
                                                        </span>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MarkerClusterGroup>
                                </MapContainer>

                                {/* Map Legend */}
                                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-gray-100 z-[1000]">
                                    <p className="text-xs font-bold text-gray-800 mb-2">Complaint Density</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded-sm bg-green-500"></div> Low
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded-sm bg-orange-500"></div> Medium
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded-sm bg-red-500"></div> High
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Complaints Column */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
                            <h3 className="font-bold text-gray-900 leading-tight">Recent Complaints</h3>
                            <p className="text-sm text-gray-500 mb-4">Latest issues reported in your area</p>

                            <div className="flex-1 space-y-3">
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <div key={i} className="flex gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                            <Skeleton width={64} height={64} className="flex-shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton width="80%" height={16} />
                                                <Skeleton width="50%" height={12} />
                                                <Skeleton width="30%" height={10} />
                                            </div>
                                        </div>
                                    ))
                                ) : complaints.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500 text-sm">No complaints found.</div>
                                ) : (
                                    complaints.slice(0, 5).map(complaint => (
                                        <div key={complaint._id} className="flex gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                            <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-400">
                                                {complaint.imageUrl ? (
                                                    <img src={getImageUrl(complaint.imageUrl)} alt={complaint.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-bold">{complaint.category.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-gray-800 line-clamp-1">{complaint.title}</h4>
                                                <p className="text-xs text-gray-500 mb-2">{complaint.location}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-full font-medium">{complaint.category}</span>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${priorityColor(complaint.priority)}`}></span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Link to="/complaints" className="w-full mt-4 py-2 border border-gray-200 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors block text-center">
                                View All Complaints
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
