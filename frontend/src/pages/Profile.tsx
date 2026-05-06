import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Save, Edit2, Shield, Camera, FileText, Lock, Eye, EyeOff, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

interface ComplaintActivity {
    _id: string;
    complaintId: string;
    title: string;
    category: string;
    status: string;
    priority: string;
    location: string;
    imageUrl?: string;
    reportedAt: string;
}

interface ProfileStats {
    total: number;
    resolved: number;
    pending: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    submitted:     { label: 'Submitted',    color: '#6b7280', bg: '#f3f4f6' },
    verified:      { label: 'Verified',     color: '#2563eb', bg: '#eff6ff' },
    assigned:      { label: 'Assigned',     color: '#7c3aed', bg: '#f5f3ff' },
    'in progress': { label: 'In Progress',  color: '#d97706', bg: '#fffbeb' },
    resolved:      { label: 'Resolved',     color: '#059669', bg: '#ecfdf5' },
};

const ChangePasswordModal = ({ onClose }: { onClose: () => void }) => {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [show, setShow] = useState({ current: false, new: false, confirm: false });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.newPassword !== form.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (form.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await api.patch('/api/users/me/change-password', {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            toast.success('Password changed successfully!');
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Lock className="w-5 h-5 text-[#115e59]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
                        <p className="text-xs text-gray-500">Update your account password</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                        { key: 'currentPassword', label: 'Current Password', showKey: 'current' },
                        { key: 'newPassword', label: 'New Password', showKey: 'new' },
                        { key: 'confirmPassword', label: 'Confirm New Password', showKey: 'confirm' },
                    ].map(({ key, label, showKey }) => (
                        <div key={key} className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">{label}</label>
                            <div className="relative">
                                <input
                                    type={(show as any)[showKey] ? 'text' : 'password'}
                                    value={(form as any)[key]}
                                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                                    required
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all text-sm"
                                />
                                <button type="button" onClick={() => setShow({ ...show, [showKey]: !(show as any)[showKey] })}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {(show as any)[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-[#115e59] text-white rounded-lg font-semibold text-sm hover:bg-[#0f4d49] transition-colors disabled:opacity-60 mt-2"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const Profile = () => {
    const savedRole = localStorage.getItem('userRole') || 'citizen';
    const isActuallyAdmin = savedRole === 'admin';
    const layoutType = isActuallyAdmin ? 'admin' : 'citizen';

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [stats, setStats] = useState<ProfileStats>({ total: 0, resolved: 0, pending: 0 });
    const [recentComplaints, setRecentComplaints] = useState<ComplaintActivity[]>([]);
    const [joinedDate, setJoinedDate] = useState('');

    const [formData, setFormData] = useState({
        name: localStorage.getItem('userName') || '',
        email: localStorage.getItem('userEmail') || '',
        phone: localStorage.getItem('userPhone') || '',
        address: '',
    });
    const [editData, setEditData] = useState(formData);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res: any = await api.get('/api/users/me');
                const { user, stats: s, recentComplaints: rc } = res;
                const data = {
                    name: user.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    address: user.address || '',
                };
                setFormData(data);
                setEditData(data);
                setStats(s);
                setRecentComplaints(rc);
                const d = new Date(user.createdAt);
                setJoinedDate(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                // Sync localStorage
                localStorage.setItem('userName', user.name);
                localStorage.setItem('userEmail', user.email);
                if (user.phone) localStorage.setItem('userPhone', user.phone);
            } catch (err: any) {
                toast.error('Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch('/api/users/me', {
                name: editData.name,
                phone: editData.phone,
                address: editData.address,
            });
            setFormData(editData);
            localStorage.setItem('userName', editData.name);
            if (editData.phone) localStorage.setItem('userPhone', editData.phone);
            toast.success('Profile updated successfully!');
            setIsEditing(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditData(formData);
        setIsEditing(false);
    };

    if (loading) {
        return (
            <Layout type={layoutType}>
                <div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48" />
                    <div className="bg-white rounded-xl h-48 border border-gray-100" />
                    <div className="bg-white rounded-xl h-64 border border-gray-100" />
                </div>
            </Layout>
        );
    }

    const initials = formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

    return (
        <Layout type={layoutType}>
            {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}

            <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                        <p className="text-gray-500 text-sm">Manage your personal information and preferences.</p>
                    </div>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button onClick={handleCancel}
                                    className="px-4 py-2 rounded-lg font-medium text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-[#115e59] text-white hover:bg-[#0f4d49] transition-colors disabled:opacity-60">
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-white text-[#115e59] border border-[#115e59] hover:bg-emerald-50 transition-colors">
                                <Edit2 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total Reports', value: stats.total, icon: FileText, color: '#667eea', bg: '#f0f0ff' },
                        { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: '#059669', bg: '#ecfdf5' },
                        { label: 'Pending', value: stats.pending, icon: Clock, color: '#d97706', bg: '#fffbeb' },
                    ].map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                                    <p className="text-xs text-gray-500">{s.label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Avatar Header */}
                    <div className="p-8 bg-gradient-to-r from-emerald-50 to-white border-b border-gray-100 flex flex-col md:flex-row items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 bg-gradient-to-br from-[#115e59] to-[#0d9488] rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md">
                                {initials}
                            </div>
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera className="w-6 h-6 text-white" />
                                </div>
                            )}
                        </div>
                        <div className="text-center md:text-left">
                            <h3 className="text-2xl font-bold text-gray-900">{formData.name}</h3>
                            <div className="flex items-center gap-2 mt-1 justify-center md:justify-start flex-wrap">
                                {isActuallyAdmin ? (
                                    <span className="bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                                        <Shield className="w-3 h-3" /> System Admin
                                    </span>
                                ) : (
                                    <span className="bg-emerald-100 text-[#115e59] px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                                        <User className="w-3 h-3" /> Verified Citizen
                                    </span>
                                )}
                                {joinedDate && (
                                    <span className="text-gray-500 text-sm">Joined {joinedDate}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="p-6 md:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-emerald-600" /> Full Name
                                </label>
                                <input type="text" value={isEditing ? editData.name : formData.name}
                                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all disabled:opacity-75 disabled:cursor-not-allowed" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-emerald-600" /> Email Address
                                </label>
                                <input type="email" value={formData.email} disabled
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg opacity-75 cursor-not-allowed" />
                                <p className="text-xs text-gray-400">Email cannot be changed</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-emerald-600" /> Phone Number
                                </label>
                                <input type="tel" value={isEditing ? editData.phone : formData.phone}
                                    onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all disabled:opacity-75 disabled:cursor-not-allowed" />
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-emerald-600" /> Primary Address
                                </label>
                                <textarea value={isEditing ? editData.address : formData.address}
                                    onChange={e => setEditData({ ...editData, address: e.target.value })}
                                    disabled={!isEditing} rows={2}
                                    placeholder={isEditing ? 'Enter your address...' : 'No address set'}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all disabled:opacity-75 disabled:cursor-not-allowed resize-none" />
                            </div>
                        </div>

                        {/* Change Password */}
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-emerald-600" /> Password
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">Change your account password</p>
                                </div>
                                <button onClick={() => setShowPasswordModal(true)}
                                    className="px-4 py-2 text-sm font-semibold text-[#115e59] border border-[#115e59] rounded-lg hover:bg-emerald-50 transition-colors">
                                    Change Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                    {recentComplaints.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-sm">No complaints reported yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentComplaints.map(c => {
                                const sc = statusConfig[c.status] || statusConfig.submitted;
                                return (
                                    <div key={c._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                                            style={{ background: c.imageUrl ? undefined : 'linear-gradient(135deg, #115e59, #0d9488)' }}>
                                            {c.imageUrl
                                                ? <img src={c.imageUrl} alt={c.title} className="w-full h-full object-cover" onError={e => { (e.target as any).style.display = 'none'; }} />
                                                : c.category.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{c.title}</p>
                                            <p className="text-xs text-gray-400 truncate">{c.location} • {new Date(c.reportedAt).toLocaleDateString()}</p>
                                        </div>
                                        <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                                            style={{ background: sc.bg, color: sc.color }}>
                                            {sc.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Profile;
