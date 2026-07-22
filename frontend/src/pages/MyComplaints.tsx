import { useState, useEffect } from 'react';
import { Eye, X, Camera, Clock, User as UserIcon, CheckCircle, ThumbsUp, ThumbsDown, Star } from 'lucide-react';
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
    assignedMunicipality?: any;
    imageUrl?: string;
    resolvedImageUrl?: string;
    reportedAt: string;
    rating?: any;
    supportCount?: number;
}

const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${normalizedUrl}`;
};

export default function MyComplaints() {
    const [complaints, setComplaints] = useState<ComplaintData[]>([]);
    const [selectedComplaint, setSelectedComplaint] = useState<ComplaintData | null>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    
    // Rating State
    const [ratingStars, setRatingStars] = useState(0);
    const [ratingReview, setRatingReview] = useState('');
    const [approvedResolution, setApprovedResolution] = useState<boolean | null>(null);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const userEmail = localStorage.getItem('userEmail') || '';
            const data: any = await api.get(`/api/complaints?reportedBy=${encodeURIComponent(userEmail)}`);
            setComplaints(data.complaints || data);
        } catch (e: any) {
            toast.error(e.message || 'Failed to load complaints');
        }
    };

    const openDetailsModal = async (complaint: ComplaintData) => {
        setSelectedComplaint(complaint);
        setDetailsModalOpen(true);
        setRatingStars(0);
        setRatingReview('');
        setApprovedResolution(null);
        
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

    const submitRating = async () => {
        if (!selectedComplaint) return;
        if (approvedResolution === null) {
            toast.error('Please approve or reject the resolution');
            return;
        }
        if (approvedResolution && ratingStars === 0) {
            toast.error('Please select a star rating');
            return;
        }

        const tid = toast.loading('Submitting feedback...');
        try {
            const updated = await api.post(`/api/complaints/${selectedComplaint._id}/rate`, {
                stars: approvedResolution ? ratingStars : 1,
                review: ratingReview,
                approvedResolution
            });
            setComplaints(prev => prev.map(c => c._id === selectedComplaint._id ? updated : c));
            setSelectedComplaint(updated);
            toast.success('Feedback submitted!', { id: tid });
            
            // refresh timeline
            const data: any = await api.get(`/api/complaints/${selectedComplaint._id}/timeline`);
            setTimeline(data.timeline || []);
        } catch (e: any) {
            toast.error(e.message || 'Failed to submit feedback', { id: tid });
        }
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-extrabold text-[#115e59] mb-2">My Complaints</h1>
                    <p className="text-gray-500">Track and manage all your reported civic issues</p>
                </div>

                <div className="space-y-4 mb-12">
                    {complaints.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                            No complaints reported yet.
                        </div>
                    ) : (
                        complaints.map(complaint => (
                            <div key={complaint._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row p-4 gap-6">
                                <div className="w-full md:w-48 h-48 bg-gray-50 rounded-xl flex-shrink-0 relative overflow-hidden flex items-center justify-center text-4xl text-gray-200 font-bold border border-gray-100">
                                    {complaint.imageUrl ? (
                                        <img src={getImageUrl(complaint.imageUrl)} alt={complaint.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-8 h-8 opacity-20" />
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-2">
                                    <div>
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-xl font-extrabold text-gray-900">{complaint.title}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                complaint.status === 'resolved' || complaint.status === 'closed' ? 'bg-green-100 text-green-700' :
                                                complaint.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {complaint.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-teal-700 mb-4">{complaint.complaintId}</p>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            <div>
                                                <p className="text-xs text-gray-400 mb-1">Location</p>
                                                <p className="text-sm font-semibold text-gray-800 truncate">{complaint.location}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 mb-1">Assigned To</p>
                                                <p className="text-sm font-semibold text-gray-800">{complaint.assignedMunicipality?.name || complaint.assignedTo || 'Unassigned'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 mb-1">Date Reported</p>
                                                <p className="text-sm font-semibold text-gray-800">{new Date(complaint.reportedAt).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 mb-1">Priority</p>
                                                <p className="text-sm font-semibold text-gray-800 uppercase">{complaint.priority}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-4 border-t border-gray-50">
                                        <button onClick={() => openDetailsModal(complaint)} className="flex items-center gap-2 bg-teal-50 text-teal-700 px-5 py-2 rounded-xl font-bold text-sm hover:bg-teal-100 transition-colors">
                                            <Eye className="w-4 h-4" /> View Details & Timeline
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {detailsModalOpen && selectedComplaint && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h2 className="text-lg font-bold text-gray-900">Issue Details & Lifecycle</h2>
                                <button onClick={() => setDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Col: Details & Rating */}
                                <div>
                                    <h3 className="text-2xl font-extrabold text-gray-900 mb-2">{selectedComplaint.title}</h3>
                                    <p className="text-sm text-gray-600 mb-6">{selectedComplaint.description}</p>
                                    
                                    {(selectedComplaint.imageUrl || selectedComplaint.resolvedImageUrl) && (
                                        <div className="mb-6 grid grid-cols-2 gap-4">
                                            {selectedComplaint.imageUrl && (
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-500 mb-2">BEFORE (REPORTED)</span>
                                                    <img src={getImageUrl(selectedComplaint.imageUrl)} alt="Before" className="w-full h-40 object-cover rounded-xl border border-gray-200" />
                                                </div>
                                            )}
                                            {selectedComplaint.resolvedImageUrl && (
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-emerald-600 mb-2">AFTER (RESOLVED)</span>
                                                    <img src={getImageUrl(selectedComplaint.resolvedImageUrl)} alt="After" className="w-full h-40 object-cover rounded-xl border border-emerald-200" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Citizen Rating System */}
                                    {selectedComplaint.status === 'resolved' && !selectedComplaint.rating && (
                                        <div className="bg-teal-50 rounded-2xl p-6 border border-teal-100 mt-6">
                                            <h4 className="font-extrabold text-teal-900 mb-2">Verify Resolution</h4>
                                            <p className="text-sm text-teal-700 mb-4">Has your issue been resolved satisfactorily?</p>
                                            
                                            <div className="flex gap-3 mb-6">
                                                <button 
                                                    onClick={() => setApprovedResolution(true)} 
                                                    className={`flex-1 py-2 rounded-xl border-2 font-bold flex items-center justify-center gap-2 ${approvedResolution === true ? 'border-green-500 bg-green-500 text-white' : 'border-green-200 text-green-700 bg-white hover:bg-green-50'}`}
                                                >
                                                    <ThumbsUp className="w-4 h-4" /> Yes, Approved
                                                </button>
                                                <button 
                                                    onClick={() => setApprovedResolution(false)} 
                                                    className={`flex-1 py-2 rounded-xl border-2 font-bold flex items-center justify-center gap-2 ${approvedResolution === false ? 'border-red-500 bg-red-500 text-white' : 'border-red-200 text-red-700 bg-white hover:bg-red-50'}`}
                                                >
                                                    <ThumbsDown className="w-4 h-4" /> No, Reopen
                                                </button>
                                            </div>

                                            {approvedResolution === true && (
                                                <div className="mb-4">
                                                    <p className="text-sm font-bold text-teal-900 mb-2">Rate the service:</p>
                                                    <div className="flex gap-2 mb-4">
                                                        {[1,2,3,4,5].map(star => (
                                                            <button key={star} onClick={() => setRatingStars(star)}>
                                                                <Star className={`w-8 h-8 ${ratingStars >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {approvedResolution !== null && (
                                                <div className="mb-4">
                                                    <textarea 
                                                        value={ratingReview} 
                                                        onChange={e => setRatingReview(e.target.value)}
                                                        placeholder={approvedResolution ? "Leave a review (optional)..." : "Why was this not resolved? Please explain..."}
                                                        className="w-full p-3 rounded-xl border border-teal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                        rows={3}
                                                    />
                                                    <button onClick={submitRating} className="mt-3 w-full bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition-colors">
                                                        Submit Feedback
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedComplaint.rating && (
                                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mt-6">
                                            <h4 className="font-extrabold text-gray-900 mb-4">Your Feedback</h4>
                                            <div className="flex gap-1 mb-2">
                                                {[1,2,3,4,5].map(star => (
                                                    <Star key={star} className={`w-5 h-5 ${selectedComplaint.rating.stars >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                                ))}
                                            </div>
                                            <p className="text-sm text-gray-600 italic">"{selectedComplaint.rating.review || 'No review provided.'}"</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right Col: Timeline */}
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <h4 className="font-extrabold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-teal-600" /> Lifecycle Timeline</h4>
                                    
                                    {timelineLoading ? (
                                        <div className="flex justify-center p-8 text-teal-600 animate-pulse">Loading timeline...</div>
                                    ) : (
                                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-teal-200 before:to-transparent">
                                            {timeline.map((item, idx) => (
                                                <div key={idx} className="relative flex items-center group is-active">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-gray-50 bg-teal-100 text-teal-600 shadow-sm shrink-0 z-10">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </div>
                                                    <div className="ml-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm w-full">
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
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}
