import { useState, useEffect, useRef } from 'react';
import {
    Building2, Plus, Edit2, Trash2, MapPin, Upload, X,
    ChevronDown, ChevronUp, AlertCircle, CheckCircle, Eye,
    BarChart2, Phone, Mail, Globe
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

interface Municipality {
    _id: string;
    name: string;
    state: string;
    district: string;
    contactEmail?: string;
    phone?: string;
    active: boolean;
    jurisdictionLevel: string;
    officeLocation?: {
        type: 'Point';
        coordinates: [number, number];
    };
    jurisdictionBoundary?: {
        type: 'Polygon';
        coordinates: number[][][];
    };
    createdAt?: string;
}

const LEVEL_LABELS: Record<string, string> = {
    municipal_corporation: 'Municipal Corporation',
    municipality: 'Municipality',
    gram_panchayat: 'Gram Panchayat',
    ward: 'Ward',
    zone: 'Zone',
    sub_zone: 'Sub Zone',
};

const COLORS = [
    '#6366f1', '#10b981', '#f97316', '#3b82f6', '#ec4899',
    '#14b8a6', '#8b5cf6', '#eab308', '#ef4444', '#06b6d4',
];

const emptyForm = {
    name: '',
    state: '',
    district: '',
    contactEmail: '',
    phone: '',
    jurisdictionLevel: 'municipal_corporation',
    officeLat: '',
    officeLng: '',
    active: true,
};

export default function MunicipalityManager() {
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Municipality | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Municipality | null>(null);
    const [geoJsonTarget, setGeoJsonTarget] = useState<Municipality | null>(null);
    const [geoJsonText, setGeoJsonText] = useState('');
    const [isUploadingGeo, setIsUploadingGeo] = useState(false);
    const [previewMC, setPreviewMC] = useState<Municipality | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [stats, setStats] = useState<any[]>([]);
    const geoFileRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [list, statsList] = await Promise.all([
                api.get<Municipality[]>('/api/municipalities'),
                api.get<any[]>('/api/municipalities/stats'),
            ]);
            setMunicipalities(list);
            setStats(statsList);
        } catch (e: any) {
            toast.error(e.message || 'Failed to load municipalities');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => {
        setEditTarget(null);
        setForm({ ...emptyForm });
        setShowModal(true);
    };

    const openEdit = (mc: Municipality) => {
        setEditTarget(mc);
        setForm({
            name: mc.name,
            state: mc.state,
            district: mc.district,
            contactEmail: mc.contactEmail || '',
            phone: mc.phone || '',
            jurisdictionLevel: mc.jurisdictionLevel,
            officeLat: mc.officeLocation?.coordinates[1]?.toString() || '',
            officeLng: mc.officeLocation?.coordinates[0]?.toString() || '',
            active: mc.active,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.state || !form.district) {
            toast.error('Name, State, and District are required');
            return;
        }
        if (!form.officeLat || !form.officeLng) {
            toast.error('Office latitude and longitude are required');
            return;
        }
        setIsSaving(true);
        try {
            const payload: any = {
                name: form.name,
                state: form.state,
                district: form.district,
                contactEmail: form.contactEmail,
                phone: form.phone,
                jurisdictionLevel: form.jurisdictionLevel,
                active: form.active,
                officeLocation: {
                    type: 'Point',
                    coordinates: [parseFloat(form.officeLng), parseFloat(form.officeLat)],
                },
                // Default a small 0.01° square boundary around the office if no boundary exists
                jurisdictionBoundary: editTarget?.jurisdictionBoundary || {
                    type: 'Polygon',
                    coordinates: [[
                        [parseFloat(form.officeLng) - 0.01, parseFloat(form.officeLat) - 0.01],
                        [parseFloat(form.officeLng) + 0.01, parseFloat(form.officeLat) - 0.01],
                        [parseFloat(form.officeLng) + 0.01, parseFloat(form.officeLat) + 0.01],
                        [parseFloat(form.officeLng) - 0.01, parseFloat(form.officeLat) + 0.01],
                        [parseFloat(form.officeLng) - 0.01, parseFloat(form.officeLat) - 0.01],
                    ]],
                },
            };

            if (editTarget) {
                await api.patch(`/api/municipalities/${editTarget._id}`, payload);
                toast.success('Municipality updated!');
            } else {
                await api.post('/api/municipalities', payload);
                toast.success('Municipality created!');
            }

            setShowModal(false);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || 'Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.patch(`/api/municipalities/${deleteTarget._id}`, { active: false });
            toast.success('Municipality deactivated');
            setDeleteTarget(null);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || 'Delete failed');
        }
    };

    const handleGeoJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setGeoJsonText(ev.target?.result as string || '');
        reader.readAsText(file);
    };

    const handleUploadBoundary = async () => {
        if (!geoJsonTarget || !geoJsonText) {
            toast.error('Paste or upload a GeoJSON file first');
            return;
        }
        setIsUploadingGeo(true);
        try {
            let parsed: any;
            try { parsed = JSON.parse(geoJsonText); } catch {
                toast.error('Invalid JSON'); return;
            }
            await api.post(`/api/municipalities/${geoJsonTarget._id}/geojson`, { geojson: parsed });
            toast.success('Boundary uploaded!');
            setGeoJsonTarget(null);
            setGeoJsonText('');
            fetchData();
        } catch (e: any) {
            toast.error(e.message || 'Upload failed');
        } finally {
            setIsUploadingGeo(false);
        }
    };

    const getStatFor = (id: string) => stats.find(s => s._id?.toString() === id);

    const polygonPositions = (mc: Municipality): [number, number][] => {
        if (!mc.jurisdictionBoundary?.coordinates?.[0]) return [];
        return mc.jurisdictionBoundary.coordinates[0].map(
            ([lng, lat]) => [lat, lng] as [number, number]
        );
    };

    return (
        <Layout type="admin">
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)', position: 'relative', overflow: 'hidden' }} className="text-white pt-10 pb-20 px-6 md:px-12 w-full">
                <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(99,102,241,0.12)', filter: 'blur(50px)' }} />
                <div className="max-w-7xl mx-auto relative">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '6px 16px', fontSize: 12, fontWeight: 600, color: '#a7f3d0', marginBottom: 20 }}>
                        <Building2 style={{ width: 14, height: 14 }} />Jurisdiction Management
                    </div>
                    <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Municipal <span style={{ color: '#5eead4' }}>Corporations</span></h1>
                    <p style={{ color: 'rgba(167,243,208,0.7)', fontSize: 15 }}>Manage jurisdictions, boundaries & geofencing zones</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-10 w-full pb-12">
                {/* Action bar */}
                <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.09)', border: '1px solid #f0f0f0', marginBottom: 24 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 style={{ fontWeight: 700, color: '#111827', fontSize: 16 }}>All Municipalities</h2>
                        <p style={{ fontSize: 13, color: '#6b7280' }}>{municipalities.length} total · {municipalities.filter(m => m.active).length} active</p>
                    </div>
                    <button
                        onClick={openCreate}
                        style={{ background: 'linear-gradient(135deg,#115e59,#0f4d49)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <Plus style={{ width: 16, height: 16 }} /> Add Municipality
                    </button>
                </div>

                {/* Jurisdiction Map */}
                {municipalities.some(m => m.jurisdictionBoundary) && (
                    <div style={{ background: 'white', borderRadius: 16, padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', marginBottom: 24 }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Globe style={{ width: 18, height: 18, color: 'white' }} />
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 700, color: '#111827' }}>Jurisdiction Boundaries</h3>
                                <p style={{ fontSize: 12, color: '#9ca3af' }}>Click any boundary to view details</p>
                            </div>
                        </div>
                        <div style={{ height: 480, borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                            <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' maxZoom={19} />
                                {municipalities.filter(m => m.active && m.jurisdictionBoundary).map((mc, idx) => {
                                    const positions = polygonPositions(mc);
                                    if (positions.length < 3) return null;
                                    const color = COLORS[idx % COLORS.length];
                                    const stat = getStatFor(mc._id);
                                    return (
                                        <Polygon
                                            key={mc._id}
                                            positions={positions}
                                            pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 2 }}
                                        >
                                            <Popup>
                                                <div style={{ fontFamily: 'system-ui', minWidth: 200 }}>
                                                    <div style={{ background: color, padding: '10px 14px', margin: '-8px -12px 10px', borderRadius: '8px 8px 0 0' }}>
                                                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{mc.name}</div>
                                                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{mc.district}, {mc.state}</div>
                                                    </div>
                                                    <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', padding: '0 2px 4px' }}>
                                                        {mc.contactEmail && <div><div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Email</div><div style={{ color: '#374151' }}>{mc.contactEmail}</div></div>}
                                                        {mc.phone && <div><div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Phone</div><div style={{ color: '#374151' }}>{mc.phone}</div></div>}
                                                        <div><div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Total Complaints</div><div style={{ color: '#374151', fontWeight: 700 }}>{stat?.total ?? 0}</div></div>
                                                        <div><div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Resolved</div><div style={{ color: '#10b981', fontWeight: 700 }}>{stat?.resolved ?? 0}</div></div>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Polygon>
                                    );
                                })}
                            </MapContainer>
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                            {municipalities.filter(m => m.active && m.jurisdictionBoundary).map((mc, idx) => (
                                <div key={mc._id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 99, padding: '4px 12px', fontSize: 12 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                                    {mc.name}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats cards */}
                {stats.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {stats.slice(0, 6).map((s, i) => (
                            <div key={s._id} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', borderLeft: `4px solid ${COLORS[i % COLORS.length]}` }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>{s.name || 'Unknown'}</div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{s.district}, {s.state}</div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div><div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Total</div><div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>{s.total}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Resolved</div><div style={{ fontWeight: 800, fontSize: 18, color: '#10b981' }}>{s.resolved}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Pending</div><div style={{ fontWeight: 800, fontSize: 18, color: '#f97316' }}>{s.pending}</div></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Municipality list */}
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading...</div>
                ) : municipalities.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: 16, padding: 60, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                        <Building2 style={{ width: 48, height: 48, color: '#e5e7eb', margin: '0 auto 16px' }} />
                        <h3 style={{ fontWeight: 700, color: '#374151', marginBottom: 8 }}>No municipalities yet</h3>
                        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>Add your first Municipal Corporation to get started</p>
                        <button onClick={openCreate} style={{ background: '#115e59', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Add Municipality</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {municipalities.map((mc, idx) => {
                            const stat = getStatFor(mc._id);
                            const color = COLORS[idx % COLORS.length];
                            const isExpanded = expandedId === mc._id;
                            return (
                                <div key={mc._id} style={{ background: 'white', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                                    {/* Card Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : mc._id)}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Building2 style={{ width: 20, height: 20, color }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{mc.name}</span>
                                                <span style={{ fontSize: 11, fontWeight: 600, background: mc.active ? '#dcfce7' : '#fee2e2', color: mc.active ? '#16a34a' : '#dc2626', borderRadius: 99, padding: '2px 8px' }}>
                                                    {mc.active ? 'Active' : 'Inactive'}
                                                </span>
                                                <span style={{ fontSize: 11, fontWeight: 600, background: '#f3f4f6', color: '#6b7280', borderRadius: 99, padding: '2px 8px' }}>
                                                    {LEVEL_LABELS[mc.jurisdictionLevel] || mc.jurisdictionLevel}
                                                </span>
                                                {mc.jurisdictionBoundary && (
                                                    <span style={{ fontSize: 11, fontWeight: 600, background: '#ede9fe', color: '#7c3aed', borderRadius: 99, padding: '2px 8px' }}>
                                                        Boundary set
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                                                {mc.district}, {mc.state}
                                                {stat && <span style={{ marginLeft: 12, fontWeight: 600, color: '#374151' }}>· {stat.total} complaints</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            <button onClick={(e) => { e.stopPropagation(); setPreviewMC(mc); }} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#6b7280' }} title="Preview map">
                                                <Eye style={{ width: 15, height: 15 }} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setGeoJsonTarget(mc); setGeoJsonText(''); }} style={{ background: '#ede9fe', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#7c3aed' }} title="Upload GeoJSON boundary">
                                                <Upload style={{ width: 15, height: 15 }} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); openEdit(mc); }} style={{ background: '#dbeafe', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#2563eb' }} title="Edit">
                                                <Edit2 style={{ width: 15, height: 15 }} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(mc); }} style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#dc2626' }} title="Deactivate">
                                                <Trash2 style={{ width: 15, height: 15 }} />
                                            </button>
                                            {isExpanded ? <ChevronUp style={{ width: 16, height: 16, color: '#9ca3af' }} /> : <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af' }} />}
                                        </div>
                                    </div>
                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 20px', background: '#fafafa' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                                                {mc.contactEmail && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <Mail style={{ width: 14, height: 14, color: '#9ca3af' }} />
                                                        <span style={{ fontSize: 13, color: '#374151' }}>{mc.contactEmail}</span>
                                                    </div>
                                                )}
                                                {mc.phone && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <Phone style={{ width: 14, height: 14, color: '#9ca3af' }} />
                                                        <span style={{ fontSize: 13, color: '#374151' }}>{mc.phone}</span>
                                                    </div>
                                                )}
                                                {mc.officeLocation && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <MapPin style={{ width: 14, height: 14, color: '#9ca3af' }} />
                                                        <span style={{ fontSize: 13, color: '#374151' }}>
                                                            {mc.officeLocation.coordinates[1].toFixed(4)}°N, {mc.officeLocation.coordinates[0].toFixed(4)}°E
                                                        </span>
                                                    </div>
                                                )}
                                                {stat && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <BarChart2 style={{ width: 14, height: 14, color: '#9ca3af' }} />
                                                        <span style={{ fontSize: 13, color: '#374151' }}>{stat.total} total, {stat.critical} critical, {stat.resolved} resolved</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ───── Add / Edit Modal ───── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowModal(false)}>
                    <div style={{ background: 'white', borderRadius: 20, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontWeight: 800, fontSize: 20, color: '#111827' }}>{editTarget ? 'Edit Municipality' : 'Add Municipality'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}><X style={{ width: 16, height: 16 }} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {[
                                { label: 'Name *', key: 'name', placeholder: 'e.g. Greater Mumbai Municipal Corporation' },
                                { label: 'State *', key: 'state', placeholder: 'e.g. Maharashtra' },
                                { label: 'District *', key: 'district', placeholder: 'e.g. Mumbai' },
                                { label: 'Contact Email', key: 'contactEmail', placeholder: 'contact@mc.gov.in', type: 'email' },
                                { label: 'Phone', key: 'phone', placeholder: '+91 22 22621234' },
                            ].map(({ label, key, placeholder, type }) => (
                                <div key={key}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
                                    <input
                                        type={type || 'text'}
                                        value={(form as any)[key]}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                        placeholder={placeholder}
                                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
                                    />
                                </div>
                            ))}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Jurisdiction Level</label>
                                <select value={form.jurisdictionLevel} onChange={e => setForm(f => ({ ...f, jurisdictionLevel: e.target.value }))} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#f9fafb', boxSizing: 'border-box' }}>
                                    {Object.entries(LEVEL_LABELS).map(([val, lab]) => (
                                        <option key={val} value={val}>{lab}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Office Latitude *</label>
                                    <input type="number" step="any" value={form.officeLat} onChange={e => setForm(f => ({ ...f, officeLat: e.target.value }))} placeholder="28.6139" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#f9fafb', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Office Longitude *</label>
                                    <input type="number" step="any" value={form.officeLng} onChange={e => setForm(f => ({ ...f, officeLng: e.target.value }))} placeholder="77.2090" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#f9fafb', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ width: 16, height: 16 }} />
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Active</span>
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: 'white', color: '#374151' }}>Cancel</button>
                            <button onClick={handleSave} disabled={isSaving} style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#115e59,#0f4d49)', color: 'white', opacity: isSaving ? 0.7 : 1 }}>
                                {isSaving ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Municipality'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── Delete Confirmation ───── */}
            {deleteTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setDeleteTarget(null)}>
                    <div style={{ background: 'white', borderRadius: 20, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: 48, height: 48, background: '#fee2e2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <AlertCircle style={{ width: 24, height: 24, color: '#dc2626' }} />
                        </div>
                        <h3 style={{ textAlign: 'center', fontWeight: 800, color: '#111827', marginBottom: 8 }}>Deactivate Municipality?</h3>
                        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
                            <strong>{deleteTarget.name}</strong> will be deactivated. Existing complaints remain linked.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: 'white' }}>Cancel</button>
                            <button onClick={handleDelete} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: '#dc2626', color: 'white' }}>Deactivate</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── GeoJSON Upload Modal ───── */}
            {geoJsonTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setGeoJsonTarget(null)}>
                    <div style={{ background: 'white', borderRadius: 20, padding: 32, width: '100%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                                <h2 style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>Upload Boundary — {geoJsonTarget.name}</h2>
                                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Paste GeoJSON or upload a file downloaded from a government/JOSM source</p>
                            </div>
                            <button onClick={() => setGeoJsonTarget(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}><X style={{ width: 16, height: 16 }} /></button>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <input ref={geoFileRef} type="file" accept=".json,.geojson" style={{ display: 'none' }} onChange={handleGeoJsonFile} />
                            <button onClick={() => geoFileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                                <Upload style={{ width: 14, height: 14 }} /> Choose GeoJSON File
                            </button>
                            <textarea
                                value={geoJsonText}
                                onChange={e => setGeoJsonText(e.target.value)}
                                placeholder={'{\n  "type": "Polygon",\n  "coordinates": [[[lng, lat], ...]]\n}'}
                                rows={10}
                                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, fontSize: 12, fontFamily: 'monospace', background: '#f9fafb', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                            />
                        </div>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#166534' }}>
                            <strong>Tip:</strong> Download official GeoJSON from data.gov.in, bhuvan.nrsc.gov.in, or OpenStreetMap Nominatim. Accepts Polygon, Feature, or FeatureCollection.
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setGeoJsonTarget(null)} style={{ flex: 1, padding: 12, border: '1px solid #e5e7eb', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: 'white' }}>Cancel</button>
                            <button onClick={handleUploadBoundary} disabled={isUploadingGeo || !geoJsonText} style={{ flex: 2, padding: 12, border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', opacity: (isUploadingGeo || !geoJsonText) ? 0.6 : 1 }}>
                                {isUploadingGeo ? 'Uploading...' : 'Upload Boundary'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── Boundary Preview Modal ───── */}
            {previewMC && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPreviewMC(null)}>
                    <div style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 700, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>{previewMC.name}</h2>
                            <button onClick={() => setPreviewMC(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}><X style={{ width: 16, height: 16 }} /></button>
                        </div>
                        {previewMC.jurisdictionBoundary ? (
                            <div style={{ height: 400, borderRadius: 12, overflow: 'hidden' }}>
                                <MapContainer
                                    center={previewMC.officeLocation
                                        ? [previewMC.officeLocation.coordinates[1], previewMC.officeLocation.coordinates[0]]
                                        : [20.5937, 78.9629]}
                                    zoom={10}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
                                    <Polygon positions={polygonPositions(previewMC)} pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.2, weight: 2 }} />
                                </MapContainer>
                            </div>
                        ) : (
                            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                                <MapPin style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                                <p>No boundary uploaded yet. Use the Upload button to add a GeoJSON boundary.</p>
                                <button onClick={() => { setPreviewMC(null); setGeoJsonTarget(previewMC); setGeoJsonText(''); }} style={{ marginTop: 16, background: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, cursor: 'pointer' }}>
                                    Upload Boundary
                                </button>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: '12px 0', borderTop: '1px solid #f3f4f6' }}>
                            {previewMC.contactEmail && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><Mail style={{ width: 14, height: 14, color: '#9ca3af' }} />{previewMC.contactEmail}</div>}
                            {previewMC.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><Phone style={{ width: 14, height: 14, color: '#9ca3af' }} />{previewMC.phone}</div>}
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                <CheckCircle style={{ width: 14, height: 14, color: previewMC.active ? '#16a34a' : '#dc2626' }} />
                                <span style={{ color: previewMC.active ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{previewMC.active ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
