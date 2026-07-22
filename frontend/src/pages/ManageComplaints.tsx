import { useState, useEffect } from 'react';
import { User as UserIcon, X, CheckCircle, Clock, MapPin, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { api } from '../utils/api';

interface ComplaintData {
    _id: string;
    complaintId: string;
    title: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
    location: string;
    description: string;
    status: string;
    reportedBy: string;
    reportedAt: string;
    aiScore?: number;
    assignedTo?: string;
    assignedMunicipality?: any;
    assignedOfficer?: any;
    imageUrl?: string;
    resolvedImageUrl?: string;
    slaDeadline?: string;
    slaBreached?: boolean;
}

const STATUSES = ['submitted', 'verified', 'assigned', 'accepted', 'in_progress', 'waiting_citizen_review', 'resolved', 'closed', 'reopened'];

const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${normalizedUrl}`;
};

export default function ManageComplaints() {
    const [complaints, setComplaints] = useState<ComplaintData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selectedComplaint, setSelectedComplaint] = useState<ComplaintData | null>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    
    // Status update state
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [resolvedImage, setResolvedImage] = useState<File | null>(null);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        setIsLoading(true);
        try {
            const data: any = await api.get('/api/complaints');
            setComplaints(data.complaints || data);
        } catch (e: any) {
            toast.error(e.message || 'Failed to load complaints');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        if (newStatus === 'resolved') {
            setResolvingId(id);
            setResolveModalOpen(true);
            return;
        }
        const tid = toast.loading(`Updating status to ${newStatus}...`);
        try {
            const updated = await api.patch(`/api/complaints/${id}/status`, { status: newStatus });
            setComplaints(prev => prev.map(c => c._id === id ? updated : c));
            if (selectedComplaint?._id === id) setSelectedComplaint(updated);
            toast.success('Status updated', { id: tid });
        } catch (e: any) {
            toast.error(e.message || 'Update failed', { id: tid });
        }
    };

    const handleResolve = async () => {
        if (!resolvingId) return;
        const tid = toast.loading('Resolving complaint...');
        try {
            const formData = new FormData();
            formData.append('status', 'resolved');
            if (resolvedImage) formData.append('resolvedImage', resolvedImage);
            
            const updated = await api.patch(`/api/complaints/${resolvingId}/status`, formData);
            setComplaints(prev => prev.map(c => c._id === resolvingId ? updated : c));
            if (selectedComplaint?._id === resolvingId) setSelectedComplaint(updated);
            
            setResolveModalOpen(false);
            setResolvedImage(null);
            toast.success('Complaint resolved', { id: tid });
        } catch (e: any) {
            toast.error(e.message || 'Failed to resolve', { id: tid });
        }
    };

    const viewDetails = async (complaint: ComplaintData) => {
        setSelectedComplaint(complaint);
        setTimelineLoading(true);
        try {
            const data: any = await api.get(`/api/complaints/${complaint._id}/timeline`);
            setTimeline(data.timeline || []);
        } catch (e) {
            toast.error('Failed to load timeline');
        } finally {
            setTimelineLoading(false);
        }
    };

    const filtered = complaints.filter(c => {
        const matchSearch = c.complaintId.toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <Layout type="admin">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Complaint Management</h1>
                    <p className="text-gray-500">Track and update civic issues through their 8-stage lifecycle.</p>
                </div>

                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Search ID or Title..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="all">All Statuses</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>)}
                    </select>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-bold text-gray-900">ID</th>
                                <th className="px-6 py-4 font-bold text-gray-900">Details</th>
                                <th className="px-6 py-4 font-bold text-gray-900">Status</th>
                                <th className="px-6 py-4 font-bold text-gray-900">Assigned To</th>
                                <th className="px-6 py-4 font-bold text-gray-900">SLA</th>
                                <th className="px-6 py-4 font-bold text-gray-900 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading complaints...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No complaints found.</td></tr>
                            ) : filtered.map(c => (
                                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 align-top font-bold text-gray-900">{c.complaintId}</td>
                                    <td className="px-6 py-4 align-top max-w-sm">
                                        <div className="font-bold text-gray-900 mb-1 truncate" title={c.title}>{c.title}</div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded font-semibold text-gray-700">{c.category}</span>
                                            <span className={`px-2 py-0.5 rounded font-bold ${
                                                c.priority === 'emergency' ? 'bg-red-100 text-red-700' :
                                                c.priority === 'critical' ? 'bg-orange-100 text-orange-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>{c.priority.toUpperCase()}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {c.location}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <select
                                            value={c.status}
                                            onChange={e => handleUpdateStatus(c._id, e.target.value)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider appearance-none cursor-pointer border ${
                                                c.status === 'resolved' || c.status === 'closed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                c.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                c.status === 'submitted' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                                                'bg-orange-50 text-orange-700 border-orange-200'
                                            }`}
                                        >
                                            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 align-top text-xs text-gray-600">
                                        {c.assignedMunicipality?.name ? (
                                            <div>
                                                <div className="font-bold text-teal-700">{c.assignedMunicipality.name}</div>
                                                <div className="text-gray-400">{c.assignedOfficer?.name || c.assignedTo || 'Unassigned'}</div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 align-top text-xs">
                                        {c.slaDeadline ? (
                                            <div className={`${c.slaBreached ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                                {c.slaBreached && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                                                {new Date(c.slaDeadline).toLocaleString()}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 align-top text-right">
                                        <button onClick={() => viewDetails(c)} className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors">
                                            View Timeline
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resolve Modal */}
            {resolveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Resolve Issue</h2>
                        <p className="text-sm text-gray-500 mb-4">Please upload a photo showing the issue has been fixed (optional but recommended).</p>
                        <input type="file" accept="image/*" onChange={e => setResolvedImage(e.target.files?.[0] || null)} className="w-full border p-2 rounded-lg mb-6 text-sm" />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setResolveModalOpen(false)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                            <button onClick={handleResolve} className="px-4 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl">Mark Resolved</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details & Timeline Drawer */}
            {selectedComplaint && (
                <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-40 border-l border-gray-100 flex flex-col transform transition-transform duration-300">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h2 className="font-extrabold text-lg text-gray-900">{selectedComplaint.complaintId}</h2>
                        <button onClick={() => setSelectedComplaint(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="mb-8">
                            <h3 className="font-bold text-xl text-gray-900 mb-2">{selectedComplaint.title}</h3>
                            <p className="text-sm text-gray-600 leading-relaxed mb-4">{selectedComplaint.description}</p>
                            {selectedComplaint.imageUrl && (
                                <img src={getImageUrl(selectedComplaint.imageUrl)} alt="Reported" className="w-full h-48 object-cover rounded-xl border border-gray-200 shadow-sm" />
                            )}
                        </div>

                        <h4 className="font-bold text-gray-900 uppercase text-xs tracking-wider mb-4 text-teal-700 flex items-center gap-2"><Clock className="w-4 h-4" /> Activity Timeline</h4>
                        
                        {timelineLoading ? (
                            <div className="flex justify-center p-8"><span className="animate-spin text-teal-600">⌛</span></div>
                        ) : (
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                {timeline.map((item, idx) => (
                                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-teal-100 text-teal-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <CheckCircle className="w-4 h-4" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="font-bold text-gray-900 text-sm">{item.action.replace(/_/g, ' ').toUpperCase()}</div>
                                                <div className="text-xs text-gray-400">{new Date(item.at).toLocaleDateString()}</div>
                                            </div>
                                            <p className="text-sm text-gray-600">{item.comment}</p>
                                            <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                                <UserIcon className="w-3 h-3" /> {item.by} ({item.role})
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
}
