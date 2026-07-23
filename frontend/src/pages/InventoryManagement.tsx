import { useState, useEffect } from 'react';
import { Package, Plus, Truck, Wrench, Users, Search, Edit, Trash2, X } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const ASSET_TYPES = ['vehicle', 'equipment', 'material', 'staff'];
const ASSET_STATUSES = ['available', 'deployed', 'maintenance', 'retired'];

const TYPE_ICONS: Record<string, any> = {
    vehicle: Truck, equipment: Wrench, material: Package, staff: Users
};

const TYPE_COLORS: Record<string, string> = {
    vehicle: '#3b82f6', equipment: '#f59e0b', material: '#10b981', staff: '#8b5cf6'
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    available: { color: '#16a34a', bg: '#f0fdf4', label: 'Available' },
    deployed: { color: '#2563eb', bg: '#eff6ff', label: 'Deployed' },
    maintenance: { color: '#d97706', bg: '#fffbeb', label: 'Maintenance' },
    retired: { color: '#6b7280', bg: '#f9fafb', label: 'Retired' },
};

export default function InventoryManagement() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [form, setForm] = useState({ name: '', type: 'vehicle', description: '', status: 'available', quantity: 1, unit: '', location: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const data = await api.get<any[]>('/api/inventory');
            setItems(data || []);
        } catch { toast.error('Failed to load inventory'); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editItem) {
                await api.patch(`/api/inventory/${editItem._id}`, form);
                toast.success('Asset updated');
            } else {
                await api.post('/api/inventory', form);
                toast.success('Asset added');
            }
            fetchItems();
            setShowAddModal(false);
            setEditItem(null);
            setForm({ name: '', type: 'vehicle', description: '', status: 'available', quantity: 1, unit: '', location: '' });
        } catch (e: any) { toast.error(e.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this asset?')) return;
        try {
            await api.delete(`/api/inventory/${id}`);
            setItems(prev => prev.filter(i => i._id !== id));
            toast.success('Deleted');
        } catch (e: any) { toast.error(e.message || 'Failed'); }
    };

    const openEdit = (item: any) => {
        setEditItem(item);
        setForm({ name: item.name, type: item.type, description: item.description || '', status: item.status, quantity: item.quantity || 1, unit: item.unit || '', location: item.location || '' });
        setShowAddModal(true);
    };

    const filtered = items.filter(i => {
        const matchSearch = !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.assetId?.toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === 'all' || i.type === typeFilter;
        const matchStatus = statusFilter === 'all' || i.status === statusFilter;
        return matchSearch && matchType && matchStatus;
    });

    // Stats
    const stats = {
        total: items.length,
        available: items.filter(i => i.status === 'available').length,
        deployed: items.filter(i => i.status === 'deployed').length,
        maintenance: items.filter(i => i.status === 'maintenance').length,
    };

    return (
        <Layout type="admin">
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e40af,#2563eb)', padding: '40px 32px 80px', color: 'white' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: '#bfdbfe', marginBottom: 20 }}>
                            <Package style={{ width: 14, height: 14 }} /> Municipal Assets
                        </div>
                        <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 8px' }}>Inventory Management</h1>
                        <p style={{ color: 'rgba(191,219,254,0.8)', fontSize: 16, margin: 0 }}>Track vehicles, equipment, materials and staff resources</p>
                    </div>
                    <button
                        onClick={() => { setEditItem(null); setForm({ name: '', type: 'vehicle', description: '', status: 'available', quantity: 1, unit: '', location: '' }); setShowAddModal(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', color: '#1e40af', padding: '12px 24px', borderRadius: 12, fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14 }}
                    >
                        <Plus style={{ width: 18, height: 18 }} /> Add Asset
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: 1200, margin: '-40px auto 0', padding: '0 32px 48px' }}>
                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
                    {[
                        { label: 'Total Assets', value: stats.total, color: '#3b82f6', bg: '#eff6ff' },
                        { label: 'Available', value: stats.available, color: '#16a34a', bg: '#f0fdf4' },
                        { label: 'Deployed', value: stats.deployed, color: '#2563eb', bg: '#dbeafe' },
                        { label: 'Maintenance', value: stats.maintenance, color: '#d97706', bg: '#fffbeb' },
                    ].map((stat, i) => (
                        <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                            <div style={{ fontSize: 36, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginTop: 4 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, background: '#f9fafb', boxSizing: 'border-box' }} />
                    </div>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, background: '#f9fafb' }}>
                        <option value="all">All Types</option>
                        {ASSET_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, background: '#f9fafb' }}>
                        <option value="all">All Statuses</option>
                        {ASSET_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>)}
                    </select>
                </div>

                {/* Assets Grid */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                        {[...Array(6)].map((_, i) => <div key={i} style={{ background: 'white', borderRadius: 16, height: 180, animation: 'pulse 2s infinite' }} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: 20, padding: 80, textAlign: 'center', color: '#9ca3af', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                        <Package style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }} />
                        <div style={{ fontWeight: 700, fontSize: 16 }}>No assets found</div>
                        <div style={{ fontSize: 14, marginTop: 8 }}>Add municipal assets to start tracking</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                        {filtered.map(item => {
                            const Icon = TYPE_ICONS[item.type] || Package;
                            const color = TYPE_COLORS[item.type] || '#6b7280';
                            const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.available;
                            return (
                                <div key={item._id} style={{ background: 'white', borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6', transition: 'transform 0.2s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}
                                >
                                    <div style={{ background: color + '15', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon style={{ width: 22, height: 22, color: 'white' }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, color: '#111827', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>{item.assetId}</div>
                                        </div>
                                        <span style={{ background: statusConf.bg, color: statusConf.color, padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{statusConf.label}</span>
                                    </div>
                                    <div style={{ padding: '14px 20px' }}>
                                        {item.description && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, lineHeight: 1.5 }}>{item.description}</div>}
                                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>
                                            {item.location && <span>📍 {item.location}</span>}
                                            {item.quantity > 1 && <span>📦 Qty: {item.quantity} {item.unit}</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => openEdit(item)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#374151' }}>
                                                <Edit style={{ width: 13, height: 13 }} /> Edit
                                            </button>
                                            <button onClick={() => handleDelete(item._id)} style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #fee2e2', background: '#fef2f2', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>
                                                <Trash2 style={{ width: 13, height: 13 }} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
                    <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontWeight: 800, color: '#111827', margin: 0, fontSize: 18 }}>{editItem ? 'Edit Asset' : 'Add New Asset'}</h2>
                            <button onClick={() => { setShowAddModal(false); setEditItem(null); }} style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#6b7280' }}>
                                <X style={{ width: 18, height: 18 }} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Asset Name *</label>
                                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="e.g. Garbage Truck A1" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Type</label>
                                    <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14 }}>
                                        {ASSET_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Status</label>
                                    <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14 }}>
                                        {ASSET_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Quantity</label>
                                    <input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({...f, quantity: parseInt(e.target.value)}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Unit</label>
                                    <input value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} placeholder="e.g. kg" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Location</label>
                                <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="e.g. Ward 5 Depot" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} placeholder="Optional details..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, resize: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                <button type="button" onClick={() => { setShowAddModal(false); setEditItem(null); }} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: 'white', fontWeight: 700, cursor: 'pointer', color: '#6b7280' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>
                                    {saving ? 'Saving...' : editItem ? 'Update Asset' : 'Add Asset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
