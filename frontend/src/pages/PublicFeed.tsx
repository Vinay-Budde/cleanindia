import { useState, useEffect, useCallback } from 'react';
import { MapPin, AlertTriangle, ThumbsUp, CheckCircle, Search, Filter, Flame, Droplets, Trash2, Zap } from 'lucide-react';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = ['All', 'Garbage', 'Potholes', 'Drainage', 'Water Leakage', 'Street Lights', 'Water Supply', 'Electrical Hazard', 'Road Collapse', 'Others'];
const PRIORITIES = ['All', 'emergency', 'critical', 'high', 'medium', 'low'];

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string; border: string }> = {
  emergency: { color: '#dc2626', bg: '#fef2f2', label: 'EMERGENCY', border: '#dc2626' },
  critical:  { color: '#ea580c', bg: '#fff7ed', label: 'CRITICAL',  border: '#ea580c' },
  high:      { color: '#d97706', bg: '#fffbeb', label: 'HIGH',      border: '#f59e0b' },
  medium:    { color: '#2563eb', bg: '#eff6ff', label: 'MEDIUM',    border: '#3b82f6' },
  low:       { color: '#16a34a', bg: '#f0fdf4', label: 'LOW',       border: '#22c55e' },
};

const CATEGORY_ICONS: Record<string, any> = {
  'Garbage': Trash2,
  'Drainage': Droplets,
  'Water Leakage': Droplets,
  'Electrical Hazard': Zap,
};

async function fetchPublicFeed(params: Record<string, any>) {
  const token = localStorage.getItem('token');
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  const url = `${API_URL}/api/complaints/public-feed${query ? '?' + query : ''}`;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-auth-token'] = token;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch public feed');
  const data = await res.json();
  return data.data ?? data;
}

async function postAction(endpoint: string) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-auth-token'] = token;
  }
  const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers, body: JSON.stringify({}) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.error || 'Request failed');
  return json.data ?? json;
}

export default function PublicFeed() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [prioFilter, setPrioFilter] = useState('All');
  const [supporting, setSupporting] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(null)
    );
  }, []);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 50 };
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
        params.radius = 10000;
      }
      const data = await fetchPublicFeed(params);
      setComplaints(data.complaints || data || []);
    } catch {
      toast.error('Failed to load public feed');
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const handleSupport = async (id: string) => {
    if (!isLoggedIn) { toast.error('Please login to support complaints'); return; }
    setSupporting(id);
    try {
      await postAction(`/api/complaints/${id}/support`);
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, supportCount: (c.supportCount || 0) + 1 } : c));
      toast.success('Voted! Priority may increase.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to vote');
    } finally {
      setSupporting(null);
    }
  };

  const handleVerify = async (id: string) => {
    if (!isLoggedIn) { toast.error('Please login to verify complaints'); return; }
    setVerifying(id);
    try {
      const res = await postAction(`/api/complaints/${id}/verify`);
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, verificationCount: res.verificationCount, priority: res.priority } : c));
      toast.success('Complaint verified by you!');
    } catch (e: any) {
      toast.error(e.message || 'Already verified or failed');
    } finally {
      setVerifying(null);
    }
  };

  const filtered = complaints.filter(c => {
    const matchSearch = !search ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.location?.toLowerCase().includes(search.toLowerCase());
    const matchCat  = catFilter  === 'All' || c.category === catFilter;
    const matchPrio = prioFilter === 'All' || c.priority === prioFilter;
    return matchSearch && matchCat && matchPrio;
  });

  return (
    <Layout>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', padding: '48px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: '#a7f3d0', marginBottom: 20 }}>
          <Flame style={{ width: 14, height: 14 }} /> Live Civic Feed
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 900, color: 'white', margin: '0 0 12px' }}>Public Issue Feed</h1>
        <p style={{ color: 'rgba(167,243,208,0.8)', fontSize: 16, maxWidth: 600, margin: '0 auto 32px' }}>
          Track, verify, and support real civic issues in your area. Your votes drive faster resolutions.
        </p>
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: 18, height: 18, pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search complaints by title, location..."
            style={{ width: '100%', padding: '14px 20px 14px 48px', borderRadius: 99, border: 'none', fontSize: 15, background: 'rgba(255,255,255,0.95)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 48px' }}>
        {/* Filters */}
        <div style={{ background: 'white', borderRadius: 16, padding: 20, margin: '-40px 0 32px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', fontSize: 13, fontWeight: 700 }}>
            <Filter style={{ width: 16, height: 16 }} /> Filters:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRIORITIES.map(p => (
              <button key={p} onClick={() => setPrioFilter(p)} style={{
                padding: '6px 14px', borderRadius: 99,
                border: `2px solid ${prioFilter === p ? (PRIORITY_CONFIG[p]?.color || '#115e59') : '#e5e7eb'}`,
                background: prioFilter === p ? (PRIORITY_CONFIG[p]?.bg || '#f0fdf4') : 'white',
                color: prioFilter === p ? (PRIORITY_CONFIG[p]?.color || '#115e59') : '#6b7280',
                fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{
                padding: '6px 14px', borderRadius: 99,
                border: `2px solid ${catFilter === c ? '#115e59' : '#e5e7eb'}`,
                background: catFilter === c ? '#f0fdf4' : 'white',
                color: catFilter === c ? '#115e59' : '#6b7280',
                fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
            {filtered.length} issues found
          </div>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, height: 200, opacity: 0.5, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
            {filtered.map(c => {
              const config = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
              const Icon = CATEGORY_ICONS[c.category] || AlertTriangle;
              const isEmergency = c.isEmergency || c.priority === 'emergency';
              return (
                <div
                  key={c._id}
                  style={{
                    background: 'white', borderRadius: 20, overflow: 'hidden',
                    boxShadow: isEmergency ? `0 0 0 2px ${config.color}, 0 8px 32px rgba(220,38,38,0.15)` : '0 4px 20px rgba(0,0,0,0.07)',
                    border: `1px solid ${isEmergency ? config.color : '#f3f4f6'}`,
                    animation: isEmergency ? 'emergencyPulse 2s infinite' : 'none',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                    (e.currentTarget as HTMLElement).style.boxShadow = isEmergency
                      ? `0 0 0 2px ${config.color}, 0 8px 32px rgba(220,38,38,0.15)`
                      : '0 4px 20px rgba(0,0,0,0.07)';
                  }}
                >
                  <div style={{ background: config.color, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon style={{ width: 18, height: 18, color: 'white' }} />
                      <span style={{ color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '0.05em' }}>{c.category}</span>
                    </div>
                    <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                      {config.label}
                    </span>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <h3 style={{ fontWeight: 800, color: '#111827', fontSize: 15, margin: '0 0 8px', lineHeight: 1.4 }}>
                      {c.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 12, marginBottom: 12 }}>
                      <MapPin style={{ width: 12, height: 12, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.location || 'Location not specified'}
                      </span>
                    </div>
                    {Array.isArray(c.nearbyInfrastructure) && c.nearbyInfrastructure.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {c.nearbyInfrastructure.slice(0, 3).map((inf: string) => (
                          <span key={inf} style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                            📍 {inf.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>👥 {c.supportCount || 0} voted</span>
                      <span style={{ color: '#6b7280' }}>✅ {c.verificationCount || 0} verified</span>
                      <span style={{ color: '#6b7280', marginLeft: 'auto' }}>
                        {c.reportedAt ? new Date(c.reportedAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleSupport(c._id)}
                        disabled={supporting === c._id}
                        style={{
                          flex: 1, padding: '8px', borderRadius: 10,
                          border: '1.5px solid #e5e7eb', background: 'white',
                          fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          color: '#374151', transition: 'all 0.15s', opacity: supporting === c._id ? 0.6 : 1
                        }}
                      >
                        <ThumbsUp style={{ width: 14, height: 14 }} />
                        {supporting === c._id ? '...' : `Upvote (${c.supportCount || 0})`}
                      </button>
                      <button
                        onClick={() => handleVerify(c._id)}
                        disabled={verifying === c._id}
                        style={{
                          flex: 1, padding: '8px', borderRadius: 10,
                          border: '1.5px solid #d1fae5', background: '#f0fdf4',
                          fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          color: '#065f46', transition: 'all 0.15s', opacity: verifying === c._id ? 0.6 : 1
                        }}
                      >
                        <CheckCircle style={{ width: 14, height: 14 }} />
                        {verifying === c._id ? '...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 20px', color: '#9ca3af' }}>
                <AlertTriangle style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }} />
                <div style={{ fontWeight: 700, fontSize: 18 }}>No complaints found</div>
                <div style={{ fontSize: 14, marginTop: 8 }}>Try changing filters or allowing location access</div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes emergencyPulse {
          0%,100% { box-shadow: 0 0 0 2px #dc2626, 0 8px 32px rgba(220,38,38,0.15); }
          50%      { box-shadow: 0 0 0 4px #dc2626, 0 8px 32px rgba(220,38,38,0.3); }
        }
      `}</style>
    </Layout>
  );
}
