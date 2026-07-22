import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Eye, EyeOff, Building2, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    state_admin: 'State Admin',
    commissioner: 'Municipal Commissioner',
    zone_officer: 'Zone Officer',
    ward_officer: 'Ward Officer',
    field_inspector: 'Field Inspector',
};

export default function AcceptInvite() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [invite, setInvite] = useState<any>(null);
    const [isLoadingInvite, setIsLoadingInvite] = useState(true);
    const [inviteError, setInviteError] = useState('');

    const [form, setForm] = useState({ name: '', phone: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchInvite = async () => {
            if (!token) return;
            try {
                const data = await api.get(`/api/auth/invite/${token}`);
                setInvite(data);
            } catch (e: any) {
                setInviteError(e.message || 'Invalid or expired invitation link.');
            } finally {
                setIsLoadingInvite(false);
            }
        };
        fetchInvite();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (!form.name || !form.phone || !form.password) {
            toast.error('All fields are required');
            return;
        }
        setIsSubmitting(true);
        try {
            const result: any = await api.post(`/api/auth/accept-invite/${token}`, {
                name: form.name,
                phone: form.phone,
                password: form.password,
            });
            // Store auth
            localStorage.setItem('token', result.token);
            localStorage.setItem('userRole', result.user.role);
            localStorage.setItem('userEmail', result.user.email);
            localStorage.setItem('userName', result.user.name);
            toast.success('Account activated! Welcome aboard.');
            navigate('/admin/dashboard');
        } catch (e: any) {
            toast.error(e.message || 'Failed to activate account');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingInvite) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 style={{ width: 40, height: 40, color: '#5eead4', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (inviteError || !invite) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div style={{ background: 'white', borderRadius: 20, padding: 48, textAlign: 'center', maxWidth: 440, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
                    <div style={{ width: 64, height: 64, background: '#fee2e2', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <AlertCircle style={{ width: 32, height: 32, color: '#dc2626' }} />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Invitation Invalid</h2>
                    <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>{inviteError || 'This invitation link is invalid or has already been used.'}</p>
                    <button onClick={() => navigate('/')} style={{ background: '#115e59', color: 'white', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            {/* Background decorations */}
            <div style={{ position: 'fixed', top: '-100px', right: '-100px', width: 400, height: 400, borderRadius: '50%', background: 'rgba(94,234,212,0.06)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', bottom: '-80px', left: '-80px', width: 300, height: 300, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 480 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '8px 20px', marginBottom: 20 }}>
                        <Shield style={{ width: 14, height: 14, color: '#5eead4' }} />
                        <span style={{ color: '#5eead4', fontWeight: 700, fontSize: 12 }}>OFFICIAL INVITATION</span>
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 900, color: 'white', marginBottom: 8 }}>Join Clean India</h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>Government Civic Management Platform</p>
                </div>

                {/* Card */}
                <div style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderRadius: 24, padding: 40, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.3)' }}>
                    {/* Invite Info */}
                    <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, background: '#115e59', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Building2 style={{ width: 20, height: 20, color: 'white' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, color: '#115e59', fontSize: 15 }}>{ROLE_LABELS[invite.role] || invite.role}</div>
                            <div style={{ fontSize: 13, color: '#16a34a', marginTop: 2 }}>
                                {invite.municipalityName || 'Municipal Corporation'} · {invite.email}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Your full official name"
                                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 14, outline: 'none', background: '#f9fafb', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                    onFocus={e => e.target.style.borderColor = '#115e59'}
                                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                    required
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile Number *</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    placeholder="10-digit mobile number"
                                    maxLength={10}
                                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 14, outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
                                    onFocus={e => e.target.style.borderColor = '#115e59'}
                                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Set Password *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        placeholder="Min 8 chars, uppercase, lowercase, special"
                                        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 44px 12px 14px', fontSize: 14, outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
                                        onFocus={e => e.target.style.borderColor = '#115e59'}
                                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                                        {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password *</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.confirmPassword}
                                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                    placeholder="Re-enter password"
                                    style={{ width: '100%', border: `1.5px solid ${form.confirmPassword && form.confirmPassword !== form.password ? '#dc2626' : '#e5e7eb'}`, borderRadius: 10, padding: '12px 14px', fontSize: 14, outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
                                    required
                                />
                                {form.confirmPassword && form.confirmPassword !== form.password && (
                                    <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Passwords do not match</p>
                                )}
                            </div>

                            {/* Email (read-only) */}
                            <div style={{ background: '#f3f4f6', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>
                                📧 Account email: <strong style={{ color: '#374151' }}>{invite.email}</strong>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                style={{ background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg,#115e59,#0f4d49)', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 800, fontSize: 15, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, transition: 'all 0.2s' }}
                            >
                                {isSubmitting ? (
                                    <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Activating Account...</>
                                ) : (
                                    <><CheckCircle style={{ width: 18, height: 18 }} /> Activate My Account</>
                                )}
                            </button>
                        </div>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 20 }}>
                        By activating your account, you agree to the Clean India Government Platform terms of service.
                    </p>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
