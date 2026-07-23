import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Route, RefreshCw, Target } from 'lucide-react';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PRIORITY_COLORS: Record<string, string> = {
  emergency: '#dc2626',
  critical:  '#ea580c',
  high:      '#f59e0b',
  medium:    '#3b82f6',
  low:       '#22c55e',
};

async function apiGet(endpoint: string, params: Record<string, any>) {
  const token = localStorage.getItem('token');
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  const url = `${API_URL}${endpoint}${query ? '?' + query : ''}`;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-auth-token'] = token;
  }
  const res = await fetch(url, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.error || 'Request failed');
  return json.data ?? json;
}

async function apiPost(endpoint: string, body: any) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-auth-token'] = token;
  }
  const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || 'Request failed');
  }
}

export default function RoutePlanner() {
  const [officerLocation, setOfficerLocation] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setOfficerLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
        toast.success('Location captured!');
      },
      () => { toast.error('Location access denied'); setLocating(false); }
    );
  };

  const planRoute = async () => {
    if (!officerLocation) { toast.error('Get your location first'); return; }
    setLoading(true);
    try {
      const data = await apiGet('/api/complaints/officer-route', {
        officerLat: officerLocation[0],
        officerLng: officerLocation[1],
      });
      setRoute(data);
      toast.success(`Optimized route with ${data.waypoints?.length || 0} stops`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to plan route');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (officerLocation) {
      apiPost('/api/complaints/officer-location', {
        latitude: officerLocation[0],
        longitude: officerLocation[1],
      }).catch(() => { /* silent */ });
    }
  }, [officerLocation]);

  const mapCenter: [number, number] = officerLocation || [20.5937, 78.9629];

  return (
    <Layout type="admin">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f2027,#1e3a5f)', padding: '32px 24px', color: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.15)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Route style={{ width: 24, height: 24 }} />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Smart Route Planner</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>AI-optimized field complaint resolution routing</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <button
              onClick={getLocation}
              disabled={locating}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '10px 20px', borderRadius: 12, fontWeight: 700, cursor: locating ? 'not-allowed' : 'pointer', fontSize: 14, opacity: locating ? 0.7 : 1 }}
            >
              <Navigation style={{ width: 16, height: 16 }} />
              {locating ? 'Locating...' : officerLocation ? '✅ Location Set' : 'Get My Location'}
            </button>
            <button
              onClick={planRoute}
              disabled={loading || !officerLocation}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: officerLocation ? '#115e59' : 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: 12, fontWeight: 700, cursor: officerLocation && !loading ? 'pointer' : 'not-allowed', fontSize: 14, opacity: !officerLocation || loading ? 0.7 : 1 }}
            >
              {loading
                ? <RefreshCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                : <Target style={{ width: 16, height: 16 }} />
              }
              {loading ? 'Planning...' : 'Plan Optimal Route'}
            </button>
          </div>

          {route && (
            <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
              {[
                { value: route.waypoints?.length || 0, label: 'Complaints' },
                { value: `${route.totalDistanceKm ?? '—'} km`, label: 'Total Distance' },
                { value: `${route.totalDurationMins ?? '—'} min`, label: 'Est. Duration' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 20px', textAlign: 'center', minWidth: 110 }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: route ? '1fr 340px' : '1fr', height: 'calc(100vh - 280px)', minHeight: 500 }}>
        {/* Map */}
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} key={mapCenter.join(',')}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {officerLocation && (
            <Marker
              position={officerLocation}
              icon={L.divIcon({
                html: '<div style="background:#115e59;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
                iconSize: [20, 20],
                className: '',
              })}
            >
              <Popup><b>📍 Your Location</b></Popup>
            </Marker>
          )}

          {route?.waypoints?.map((wp: any, idx: number) => (
            <Marker
              key={idx}
              position={[wp.lat, wp.lng]}
              icon={L.divIcon({
                html: `<div style="background:${PRIORITY_COLORS[wp.priority] || '#3b82f6'};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${idx + 1}</div>`,
                iconSize: [28, 28],
                className: '',
              })}
            >
              <Popup>
                <b>Stop {idx + 1}: {wp.title}</b><br />
                Priority: <span style={{ color: PRIORITY_COLORS[wp.priority], fontWeight: 700 }}>{(wp.priority || '').toUpperCase()}</span><br />
                ID: {wp.complaintId}
              </Popup>
            </Marker>
          ))}

          {route?.polyline && route.polyline.length > 0 && (
            <Polyline positions={route.polyline} color="#115e59" weight={4} opacity={0.8} />
          )}
        </MapContainer>

        {/* Sidebar */}
        {route && (
          <div style={{ background: 'white', borderLeft: '1px solid #f3f4f6', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb', flexShrink: 0 }}>
              <h3 style={{ fontWeight: 800, color: '#111827', margin: '0 0 4px', fontSize: 16 }}>Optimized Stops</h3>
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Sorted by priority → distance</p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {route.waypoints?.map((wp: any, idx: number) => (
                <div key={idx} style={{ padding: '16px 20px', borderBottom: '1px solid #f9fafb', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, background: PRIORITY_COLORS[wp.priority] || '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, lineHeight: 1.3, marginBottom: 4 }}>{wp.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ background: (PRIORITY_COLORS[wp.priority] || '#3b82f6') + '20', color: PRIORITY_COLORS[wp.priority] || '#3b82f6', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {(wp.priority || 'medium').toUpperCase()}
                      </span>
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>{wp.complaintId}</span>
                    </div>
                  </div>
                </div>
              ))}
              {(!route.waypoints || route.waypoints.length === 0) && (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  <MapPin style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontWeight: 700 }}>No assigned complaints</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>All clear in your area!</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Layout>
  );
}
