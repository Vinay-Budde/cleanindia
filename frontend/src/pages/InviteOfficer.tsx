import { useState, useEffect } from 'react';
import {
    UserPlus, Mail, Shield, Building2, X, CheckCircle,
    Copy, Send, AlertCircle, Layers
} from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const ROLES = [
    { value: 'commissioner', label: 'Municipal Commissioner', desc: 'Manages the entire municipality', color: '#6366f1' },
    { value: 'zone_officer', label: 'Zone Officer', desc: 'Manages a specific zone', color: '#f97316' },
    { value: 'ward_officer', label: 'Ward Officer', desc: 'Manages a specific ward', color: '#3b82f6' },
    { value: 'field_inspector', label: 'Field Inspector', desc: 'Ground-level complaint resolution', color: '#10b981' },
    { value: 'state_admin', label: 'State Admin', desc: 'State-level administrator', color: '#8b5cf6' },
];



export default function InviteOfficer() {
    const [municipalities, setMunicipalities] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);

    const [form, setForm] = useState({
        email: '',
        role: '',
        municipalityId: '',
        zoneId: '',
        wardId: '',
        municipalityName: '',
    });

    const [isSending, setIsSending] = useState(false);
    const [sentInvite, setSentInvite] = useState<{ inviteUrl: string; email: string } | null>(null);


    useEffect(() => {
        api.get<any[]>('/api/municipalities?active=true').then(setMunicipalities).catch(() => {});
        fetchRecentInvites();
    }, []);

    useEffect(() => {
        if (form.municipalityId) {
            api.get<any[]>(`/api/zones?municipalityId=${form.municipalityId}&active=true`).then(setZones).catch(() => {});
        } else {
            setZones([]);
            setWards([]);
        }
    }, [form.municipalityId]);

    useEffect(() => {
        if (form.zoneId) {
            api.get<any[]>(`/api/wards?zoneId=${form.zoneId}&active=true`).then(setWards).catch(() => {});
        } else {
            setWards([]);
        }
    }, [form.zoneId]);

    const fetchRecentInvites = async () => {
        // For now, we skip if the endpoint doesn't exist yet
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.role) {
            toast.error('Email and role are required');
            return;
        }
        setIsSending(true);
        try {
            const payload: any = {
                email: form.email,
                role: form.role,
                municipalityName: form.municipalityName,
            };
            if (form.municipalityId) payload.municipalityId = form.municipalityId;
            if (form.zoneId) payload.zoneId = form.zoneId;
            if (form.wardId) payload.wardId = form.wardId;

            const result: any = await api.post('/api/auth/invite', payload);
            setSentInvite({ inviteUrl: result.inviteUrl, email: result.email });
            setForm({ email: '', role: '', municipalityId: '', zoneId: '', wardId: '', municipalityName: '' });
            toast.success('Invitation sent!');
        } catch (e: any) {
            toast.error(e.message || 'Failed to send invitation');
        } finally {
            setIsSending(false);
        }
    };

    const copyLink = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success('Invite link copied!');
    };



    return (
        <Layout type="admin">
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)', position: 'relative', overflow: 'hidden' }} className="text-white pt-10 pb-20 px-6 md:px-12 w-full">
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: 300, height: 300, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', filter: 'blur(60px)' }} />
                <div className="max-w-5xl mx-auto relative">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '6px 16px', fontSize: 12, fontWeight: 600, color: '#a7f3d0', marginBottom: 20 }}>
                        <Shield style={{ width: 14, height: 14 }} /> Officer Management
                    </div>
                    <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Invite <span style={{ color: '#5eead4' }}>Officers</span></h1>
                    <p style={{ color: 'rgba(167,243,208,0.7)', fontSize: 15 }}>Send official invitation links to government officers</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 -mt-12 relative z-10 w-full pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Invite Form */}
                    <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.09)', border: '1px solid #f0f0f0' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div style={{ background: 'linear-gradient(135deg,#115e59,#0f766e)', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <UserPlus style={{ width: 20, height: 20, color: 'white' }} />
                            </div>
                            <div>
                                <h2 style={{ fontWeight: 800, color: '#111827', fontSize: 18 }}>Send Invitation</h2>
                                <p style={{ fontSize: 13, color: '#9ca3af' }}>Officer will receive a secure signup link</p>
                            </div>
                        </div>

                        <form onSubmit={handleSend}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Email */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official Email *</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                            placeholder="officer@municipality.gov.in"
                                            required
                                            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '11px 12px 11px 38px', fontSize: 14, outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                {/* Role */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role *</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        {ROLES.map(r => (
                                            <button
                                                key={r.value}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, role: r.value }))}
                                                style={{ border: `2px solid ${form.role === r.value ? r.color : '#e5e7eb'}`, borderRadius: 10, padding: '10px 12px', textAlign: 'left', cursor: 'pointer', background: form.role === r.value ? `${r.color}10` : 'white', transition: 'all 0.2s' }}
                                            >
                                                <div style={{ fontWeight: 700, fontSize: 12, color: form.role === r.value ? r.color : '#374151' }}>{r.label}</div>
                                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{r.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Municipality */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Municipality</label>
                                    <select
                                        value={form.municipalityId}
                                        onChange={e => {
                                            const mc = municipalities.find(m => m._id === e.target.value);
                                            setForm(f => ({ ...f, municipalityId: e.target.value, municipalityName: mc?.name || '', zoneId: '', wardId: '' }));
                                        }}
                                        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '11px 12px', fontSize: 14, background: '#f9fafb', boxSizing: 'border-box' }}
                                    >
                                        <option value="">Select municipality (optional)</option>
                                        {municipalities.map(m => <option key={m._id} value={m._id}>{m.name} — {m.district}</option>)}
                                    </select>
                                </div>

                                {/* Zone */}
                                {zones.length > 0 && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zone</label>
                                        <select value={form.zoneId} onChange={e => setForm(f => ({ ...f, zoneId: e.target.value, wardId: '' }))} style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '11px 12px', fontSize: 14, background: '#f9fafb', boxSizing: 'border-box' }}>
                                            <option value="">Select zone (optional)</option>
                                            {zones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Ward */}
                                {wards.length > 0 && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ward</label>
                                        <select value={form.wardId} onChange={e => setForm(f => ({ ...f, wardId: e.target.value }))} style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '11px 12px', fontSize: 14, background: '#f9fafb', boxSizing: 'border-box' }}>
                                            <option value="">Select ward (optional)</option>
                                            {wards.map(w => <option key={w._id} value={w._id}>{w.name} {w.wardNumber ? `(Ward ${w.wardNumber})` : ''}</option>)}
                                        </select>
                                    </div>
                                )}

                                <button type="submit" disabled={isSending || !form.email || !form.role} style={{ background: !form.email || !form.role ? '#e5e7eb' : 'linear-gradient(135deg,#115e59,#0f4d49)', color: !form.email || !form.role ? '#9ca3af' : 'white', border: 'none', borderRadius: 12, padding: '13px', fontWeight: 800, fontSize: 15, cursor: (!form.email || !form.role) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, transition: 'all 0.2s' }}>
                                    <Send style={{ width: 16, height: 16 }} />
                                    {isSending ? 'Sending Invitation...' : 'Send Invitation'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Success Banner */}
                        {sentInvite && (
                            <div style={{ background: 'linear-gradient(135deg,#115e59,#0f766e)', borderRadius: 16, padding: 24, color: 'white' }}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle style={{ width: 20, height: 20 }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 16 }}>Invitation Sent!</div>
                                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{sentInvite.email}</div>
                                    </div>
                                    <button onClick={() => setSentInvite(null)} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'white' }}><X style={{ width: 14, height: 14 }} /></button>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 12 }}>
                                    {sentInvite.inviteUrl}
                                </div>
                                <button onClick={() => copyLink(sentInvite.inviteUrl)} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 16px', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Copy style={{ width: 14, height: 14 }} /> Copy Link
                                </button>
                            </div>
                        )}

                        {/* Info Card */}
                        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
                            <h3 style={{ fontWeight: 800, color: '#111827', fontSize: 16, marginBottom: 16 }}>How It Works</h3>
                            {[
                                { icon: <Mail style={{ width: 16, height: 16, color: '#6366f1' }} />, bg: '#ede9fe', step: '1', title: 'Invitation Sent', desc: 'Officer receives a secure email with a unique link' },
                                { icon: <Shield style={{ width: 16, height: 16, color: '#3b82f6' }} />, bg: '#dbeafe', step: '2', title: 'Account Created', desc: 'Officer sets their password using the link (valid 7 days)' },
                                { icon: <Building2 style={{ width: 16, height: 16, color: '#10b981' }} />, bg: '#d1fae5', step: '3', title: 'Auto-Linked', desc: 'Account is automatically linked to their municipality/zone/ward' },
                                { icon: <Layers style={{ width: 16, height: 16, color: '#f97316' }} />, bg: '#ffedd5', step: '4', title: 'Ready to Work', desc: 'Officer can log in and manage complaints in their jurisdiction' },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < 3 ? 14 : 0 }}>
                                    <div style={{ width: 36, height: 36, background: item.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{item.title}</div>
                                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Security Note */}
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <AlertCircle style={{ width: 16, height: 16, color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                            <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                                <strong>Security:</strong> Each invitation link is single-use and expires in 7 days. Officers cannot register without a valid invitation. Municipality is auto-assigned from the token — officers cannot select it themselves.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
