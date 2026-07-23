import { useState } from 'react';
import { Search as SearchIcon, Filter, AlertTriangle, CheckCircle, Clock, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
    submitted: '#3b82f6', verified: '#8b5cf6', assigned: '#f59e0b', accepted: '#f97316',
    in_progress: '#0ea5e9', waiting_citizen_review: '#ec4899', resolved: '#10b981',
    closed: '#6b7280', reopened: '#ef4444'
};

export default function SmartSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    // Filters
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        category: 'all'
    });

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setHasSearched(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            if (query.trim()) params.append('q', query);
            if (filters.status !== 'all') params.append('status', filters.status);
            if (filters.priority !== 'all') params.append('priority', filters.priority);
            if (filters.category !== 'all') params.append('category', filters.category);

            const data = await api.get(`/api/complaints/search?${params.toString()}`);
            setResults(data || []);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout type="admin">
            {/* Header / Hero Search */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b,#334155)', padding: '60px 32px 80px', color: 'white', textAlign: 'center' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <h1 style={{ fontSize: 40, fontWeight: 900, marginBottom: 16 }}>Smart Search</h1>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
                        Quickly find complaints, assets, and officers using our advanced indexing system.
                    </p>

                    <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', gap: 12, background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 24, backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <SearchIcon style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, color: 'rgba(255,255,255,0.5)' }} />
                            <input 
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search by ID, keyword, location, or reporter..." 
                                style={{ width: '100%', padding: '16px 20px 16px 56px', borderRadius: 16, border: 'none', fontSize: 16, background: 'white', boxSizing: 'border-box', color: '#0f172a', fontWeight: 600 }} 
                            />
                        </div>
                        <button type="submit" style={{ padding: '0 32px', borderRadius: 16, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer', transition: 'all 0.2s' }}>
                            Search
                        </button>
                    </form>

                    {/* Quick Filters */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Filter style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.6)' }} />
                            <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer' }}>
                                <option value="all" style={{ color: 'black' }}>All Statuses</option>
                                <option value="submitted" style={{ color: 'black' }}>Submitted</option>
                                <option value="in_progress" style={{ color: 'black' }}>In Progress</option>
                                <option value="resolved" style={{ color: 'black' }}>Resolved</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)' }}>
                            <AlertTriangle style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.6)' }} />
                            <select value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer' }}>
                                <option value="all" style={{ color: 'black' }}>All Priorities</option>
                                <option value="emergency" style={{ color: 'black' }}>Emergency</option>
                                <option value="critical" style={{ color: 'black' }}>Critical</option>
                                <option value="high" style={{ color: 'black' }}>High</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)' }}>
                            <MapPin style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.6)' }} />
                            <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer' }}>
                                <option value="all" style={{ color: 'black' }}>All Categories</option>
                                <option value="Garbage" style={{ color: 'black' }}>Garbage</option>
                                <option value="Potholes" style={{ color: 'black' }}>Potholes</option>
                                <option value="Street Lights" style={{ color: 'black' }}>Street Lights</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1000, margin: '-40px auto 0', padding: '0 32px 48px' }}>
                <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 10px 40px rgba(0,0,0,0.08)', minHeight: 400 }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: '#9ca3af' }}>
                            <Loader2 style={{ width: 48, height: 48, animation: 'spin 1s linear infinite', color: '#3b82f6', marginBottom: 16 }} />
                            <div style={{ fontWeight: 600 }}>Searching database...</div>
                        </div>
                    ) : !hasSearched ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: '#9ca3af', textAlign: 'center' }}>
                            <SearchIcon style={{ width: 64, height: 64, opacity: 0.2, marginBottom: 16 }} />
                            <div style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>Ready to Search</div>
                            <div style={{ fontSize: 14, marginTop: 8, maxWidth: 300 }}>Enter a keyword or use the filters above to find specific complaints across the entire system.</div>
                        </div>
                    ) : results.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: '#9ca3af', textAlign: 'center' }}>
                            <SearchIcon style={{ width: 64, height: 64, opacity: 0.2, marginBottom: 16 }} />
                            <div style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>No Results Found</div>
                            <div style={{ fontSize: 14, marginTop: 8 }}>We couldn't find anything matching "{query}". Try adjusting your filters.</div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Found {results.length} Results
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {results.map((complaint: any) => (
                                    <Link key={complaint._id} to={`/admin/complaints`} style={{ textDecoration: 'none' }}>
                                        <div style={{ border: '1px solid #f1f5f9', borderRadius: 16, padding: 20, display: 'flex', gap: 20, alignItems: 'flex-start', transition: 'all 0.2s', background: '#f8fafc', cursor: 'pointer' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'white'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 25px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = '#f1f5f9'; }}
                                        >
                                            {/* Status Indicator */}
                                            <div style={{ width: 48, height: 48, borderRadius: 12, background: (STATUS_COLORS[complaint.status] || '#64748b') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {['resolved', 'closed'].includes(complaint.status) ? <CheckCircle style={{ width: 24, height: 24, color: STATUS_COLORS[complaint.status] }} /> :
                                                 ['emergency', 'critical'].includes(complaint.priority) ? <AlertTriangle style={{ width: 24, height: 24, color: '#ef4444' }} /> :
                                                 <Clock style={{ width: 24, height: 24, color: STATUS_COLORS[complaint.status] }} />}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', background: '#e2e8f0', padding: '2px 8px', borderRadius: 99 }}>{complaint.complaintId}</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[complaint.status] || '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{complaint.status.replace(/_/g, ' ')}</span>
                                                    {complaint.priority === 'emergency' && <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 99, border: '1px solid #fecaca' }}>EMERGENCY</span>}
                                                </div>
                                                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{complaint.title}</h3>
                                                <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{complaint.description}</p>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 14, height: 14 }} /> {complaint.location.split(',')[0]}</div>
                                                    <div>•</div>
                                                    <div>{new Date(complaint.reportedAt).toLocaleDateString()}</div>
                                                    <div>•</div>
                                                    <div>{complaint.category}</div>
                                                </div>
                                            </div>

                                            <div style={{ width: 40, height: 40, borderRadius: 99, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'center' }}>
                                                <ArrowRight style={{ width: 18, height: 18, color: '#64748b' }} />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
