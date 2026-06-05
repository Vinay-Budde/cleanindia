import { useState } from 'react';
import { Mail, Lock, User as UserIcon, Phone, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../utils/api';

// ── Password rules ────────────────────────────────────────────────────────
const PASSWORD_RULES = [
    { id: 'length',  label: 'At least 8 characters',       test: (p: string) => p.length >= 8 },
    { id: 'upper',   label: 'One uppercase letter (A–Z)',   test: (p: string) => /[A-Z]/.test(p) },
    { id: 'lower',   label: 'One lowercase letter (a–z)',   test: (p: string) => /[a-z]/.test(p) },
    { id: 'special', label: 'One special character (!@#…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// ── Spinner ───────────────────────────────────────────────────────────────
const Spinner = () => (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
);

const Signup = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // ── Registration State ──────────────────────────────────────────────────
    const [name,      setName]      = useState('');
    const [phone,     setPhone]     = useState('');
    const [email,     setEmail]     = useState('');
    const [password,  setPassword]  = useState('');
    const [showPass,  setShowPass]  = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Password rule results
    const ruleResults    = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) }));
    const allRulesPassed = ruleResults.every(r => r.passed);
    const passedCount    = ruleResults.filter(r => r.passed).length;
    const strengthColor  =
        passedCount === 4 ? '#22c55e' :
        passedCount === 3 ? '#eab308' :
        passedCount >= 1  ? '#f97316' : '#e5e7eb';

    // ── Handle Register ──────────────────────────────────────────────────
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!allRulesPassed) {
            toast.error('Please fix your password before continuing.');
            return;
        }
        setSubmitting(true);
        const tid = toast.loading(
            <span>
                Creating account…<br />
                <span className="text-[10px] opacity-85 block mt-0.5 font-normal">Note: Server cold-starts may take up to 1 minute.</span>
            </span>
        );
        try {
            await api.post<{ token: string; user: any }>('/api/auth/register', { name, phone, email, password });
            
            toast.success('Account created successfully! Please sign in with your credentials. 🎉', { id: tid });
            navigate('/login', { state: location.state });
        } catch (err: any) {
            toast.error(err.message || 'Registration failed', { id: tid });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Shared header ─────────────────────────────────────────────────────
    const Header = () => (
        <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-[#115e59] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                CI
            </div>
            <h1 className="text-2xl font-bold text-[#115e59] mb-1">Clean India</h1>
            <p className="text-gray-500 text-sm">Smart City Civic Management Platform</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-sans">
            <Header />

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-full max-w-[420px]">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Create Account</h2>
                    <p className="text-gray-500 text-sm mt-1">Sign up to start reporting and tracking civic issues</p>
                </div>

                <form className="space-y-4" onSubmit={handleRegister} autoComplete="off">
                    {/* Full Name */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                id="signup-name"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all"
                                required
                                minLength={2}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                id="signup-phone"
                                type="text"
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                placeholder="Enter 10-digit phone number"
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all"
                                required
                                pattern="[0-9]{10}"
                                maxLength={10}
                                title="Please enter exactly 10 digits"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                id="signup-email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all"
                                required
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                id="signup-password"
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Create a strong password"
                                className="w-full pl-9 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(s => !s)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        {/* Strength indicator */}
                        {password.length > 0 && (
                            <div className="mt-2 space-y-2">
                                <div className="flex gap-1">
                                    {[0, 1, 2, 3].map(i => (
                                        <div
                                            key={i}
                                            className="h-1 flex-1 rounded-full transition-all duration-300"
                                            style={{ background: i < passedCount ? strengthColor : '#e5e7eb' }}
                                        />
                                    ))}
                                </div>
                                <div className="space-y-1">
                                    {ruleResults.map(r => (
                                        <div key={r.id} className="flex items-center gap-1.5">
                                            {r.passed
                                                ? <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                                                : <XCircle    className="w-3 h-3 text-gray-300 shrink-0" />
                                            }
                                            <span className={`text-[11px] ${r.passed ? 'text-green-600' : 'text-gray-400'}`}>
                                                {r.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        id="signup-submit"
                        disabled={submitting || !allRulesPassed}
                        className="w-full py-2.5 rounded-lg text-white font-semibold text-sm bg-[#115e59] hover:bg-[#0f4d49] transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? <><Spinner /> Creating Account…</> : 'Create Account'}
                    </button>

                    {/* Cold start note */}
                    <p className="text-[11px] text-gray-400 text-center leading-relaxed mt-2.5">
                        ℹ️ Note: If signup is slow, the backend server might be waking up from a brief period of inactivity. This is normal and will take about a minute.
                    </p>
                </form>

                <p className="text-center text-xs text-gray-500 mt-6">
                    Already have an account?{' '}
                    <Link to="/login" state={location.state} className="text-[#115e59] font-semibold hover:underline">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
