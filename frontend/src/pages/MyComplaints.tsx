import { useState, useEffect } from 'react';
import { Search, ChevronDown, Download, ThumbsUp, MapPin, Eye, X, Camera } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

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
    imageUrl?: string;
    resolvedImageUrl?: string;
    reportedAt: string;
}

const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${normalizedUrl}`;
};

const MyComplaints = () => {
    const [complaints, setComplaints] = useState<ComplaintData[]>([]);

    // Modal state
    const [selectedComplaint, setSelectedComplaint] = useState<ComplaintData | null>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);

    const openDetailsModal = (complaint: ComplaintData) => {
        setSelectedComplaint(complaint);
        setDetailsModalOpen(true);
    };

    useEffect(() => {
        const fetchComplaints = async () => {
            try {
                // Backend filters by role automatically via JWT:
                // citizens receive only their own complaints
                const data = await api.get<ComplaintData[]>('/api/complaints');
                setComplaints(data);
            } catch (error: any) {
                console.error('Failed to fetch complaints:', error);
                toast.error(error.message || 'Failed to load complaints');
            }
        };

        fetchComplaints();
    }, []);

    // Color mappings
    const priorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'critical': return 'border-red-200 text-red-600 bg-red-50';
            case 'high': return 'border-orange-200 text-orange-600 bg-orange-50';
            case 'medium': return 'border-yellow-200 text-yellow-600 bg-yellow-50';
            case 'low': return 'border-green-200 text-green-600 bg-green-50';
            default: return 'border-blue-200 text-blue-600 bg-blue-50';
        }
    };

    const statusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'resolved': return 'bg-green-500 text-white';
            case 'in progress': return 'bg-blue-500 text-white';
            default: return 'bg-orange-500 text-white';
        }
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-[#115e59] mb-2">My Complaints</h1>
                    <p className="text-gray-500">Track and manage all your reported civic issues</p>
                </div>

                {/* Filter Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by title or location..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all"
                        />
                    </div>
                    <div className="relative min-w-[200px] w-full md:w-auto">
                        <select className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all appearance-none font-semibold text-gray-700">
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                    <div className="relative min-w-[200px] w-full md:w-auto">
                        <select className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all appearance-none font-semibold text-gray-700">
                            <option value="all">All Categories</option>
                            <option value="garbage">Garbage</option>
                            <option value="pothole">Pothole</option>
                            <option value="drainage">Drainage</option>
                            <option value="streetlight">Street Light</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* List Header */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">Showing {complaints.length} complaints</p>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                        <Download className="w-4 h-4" /> Export Report
                    </button>
                </div>

                {/* Complaints List */}
                <div className="space-y-4 mb-12">
                    {complaints.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                            No complaints reported yet.
                        </div>
                    ) : (
                        complaints.map(complaint => (
                            <div key={complaint._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
                                <div className="w-full md:w-[280px] h-[200px] md:h-auto bg-gray-50 flex-shrink-0 relative overflow-hidden flex items-center justify-center text-4xl text-gray-200 font-bold border-r border-gray-100">
                                    {complaint.imageUrl ? (
                                        <img
                                            src={getImageUrl(complaint.imageUrl)}
                                            alt={complaint.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <span className="opacity-20">{complaint.category.charAt(0).toUpperCase()}</span>
                                            <Camera className="w-6 h-6 absolute opacity-10" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="text-lg font-bold text-gray-900">{complaint.title}</h3>
                                                {complaint.aiScore && (
                                                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold tracking-wide">
                                                        AI: {complaint.aiScore}%
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`border px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase ${priorityColor(complaint.priority)}`}>
                                                    {complaint.priority}
                                                </span>
                                                <span className={`px-3 py-1 rounded text-[10px] font-bold tracking-wide uppercase ${statusColor(complaint.status)}`}>
                                                    {complaint.status}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium mb-4">{complaint.complaintId}</p>

                                        <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-4">
                                            <div>
                                                <p className="text-xs text-gray-400 mb-0.5">Location</p>
                                                <p className="text-sm font-medium text-gray-800">{complaint.location}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 mb-0.5">Category</p>
                                                <p className="text-sm font-medium text-gray-800">{complaint.category}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 mb-0.5">Reported Date</p>
                                                <p className="text-sm font-medium text-gray-800">{new Date(complaint.reportedAt).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 mb-0.5">Assigned To</p>
                                                <p className="text-sm font-medium text-gray-800">{complaint.assignedTo || '—'}</p>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-500 line-clamp-2">
                                            {complaint.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1.5 text-orange-500 font-medium"><ThumbsUp className="w-4 h-4 fill-orange-500" /> 0 upvotes</span>
                                            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-400" /> Nearby</span>
                                        </div>
                                        <button
                                            onClick={() => openDetailsModal(complaint)}
                                            className="flex items-center gap-2 bg-[#115e59] text-white px-5 py-2 rounded-md font-semibold text-sm hover:bg-[#0f4d49] transition-colors"
                                        >
                                            <Eye className="w-4 h-4" /> View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Details Modal */}
                {detailsModalOpen && selectedComplaint && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h2 className="text-lg font-bold text-gray-900">Complaint Details</h2>
                                <button
                                    onClick={() => setDetailsModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto w-full">
                                {/* Title and metadata */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold text-gray-900">{selectedComplaint.title}</h3>
                                        <span className={`px-3 py-1 rounded text-[10px] font-bold tracking-wide uppercase ${statusColor(selectedComplaint.status)}`}>
                                            {selectedComplaint.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">{selectedComplaint.description}</p>
                                </div>

                                {/* Images Section */}
                                {(selectedComplaint.imageUrl || selectedComplaint.resolvedImageUrl) && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">Photo Evidence</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedComplaint.imageUrl && (
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-gray-500 mb-1">Before (Reported)</span>
                                                    <div className="bg-gray-100 rounded-lg overflow-hidden h-48 border border-gray-200">
                                                        <img src={getImageUrl(selectedComplaint.imageUrl)} alt="Before" className="w-full h-full object-cover" />
                                                    </div>
                                                </div>
                                            )}
                                            {selectedComplaint.resolvedImageUrl && (
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-emerald-600 mb-1">After (Resolved)</span>
                                                    <div className="bg-emerald-50 rounded-lg overflow-hidden h-48 border border-emerald-200">
                                                        <img src={getImageUrl(selectedComplaint.resolvedImageUrl)} alt="After" className="w-full h-full object-cover" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                                <button
                                    onClick={() => setDetailsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
};

export default MyComplaints;
