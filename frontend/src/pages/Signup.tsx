import { useState, useEffect, useRef } from 'react';
import { Mail, Lock, User as UserIcon, Phone, Eye, EyeOff, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../utils/api';

// ── Password rules ─────────────────────────────────────────────────────────
const PASSWORD_RULES = [
    { id: 'length',    label: 'At least 8 characters',      test: (p: string) => p.length >= 8 },
    { id: 'upper',     label: 'One uppercase letter (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
    { id: 'lower',     label: 'One lowercase letter (a–z)', test: (p: string) => /[a-z]/.test(p) },
    { id: 'special',   label: 'One special character (!@#…)',test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

const Signup = () => {
    const navigate  = useNavigate();
    const location  = useLocation();

    // ── Step 1 state ───────────────────────────────────────────────────────
    const [name,     setName]     = useState('');
    const [phone,    setPhone]    = useState('');
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ── Step 2 (OTP) state ─────────────────────────────────────────────────
    const [step,    setStep]    = useState<1 | 2>(1);
    const [otp,     setOtp]     = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [verifying,  setVerifying]  = useState(false);
    const [resending,  setResending]  = useState(false);
    const [countdown,  setCountdown]  = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Password rule checks
    const ruleResults = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) }));
    const allRulesPassed = ruleResults.every(r => r.passed);
    const passedCount    = ruleResults.filter(r => r.passed).length;

    // Strength bar colour
    const strengthColor =
        passedCount === 4 ? '#22c55e' :
        passedCount === 3 ? '#eab308' :
        passedCount >= 1  ? '#f97316' : '#e5e7eb';

    // ── Countdown timer for resend ─────────────────────────────────────────
    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    // ── Step 1: Submit registration form ────────────────────────────────────
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!allRulesPassed) {
            toast.error('Please fix your password before continuing.');
            return;
        }
        setSubmitting(true);
        const tid = toast.loading('Sending verification code…');
        try {
            await api.post('/api/auth/register', { name, phone, email, password });
            toast.success('OTP sent! Check your inbox.', { id: tid });
            setStep(2);
            setCountdown(RESEND_COOLDOWN);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        } catch (err: any) {
            toast.error(err.message || 'Registration failed', { id: tid });
        } finally {
            setSubmitting(false);
        }
    };

    // ── OTP input: typing ──────────────────────────────────────────────────
    const handleOtpChange = (idx: number, val: string) => {
        const digit = val.replace(/\D/g, '').slice(-1);
        const next = [...otp];
        next[idx] = digit;
        setOtp(next);
        if (digit && idx < OTP_LENGTH - 1) {
            inputRefs.current[idx + 1]?.focus();
        }
    };

    // OTP input: backspace
    const handleOtpKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
            inputRefs.current[idx - 1]?.focus();
        }
    };

    // OTP input: paste
    const handleOtpPaste = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        if (text.length) {
            setOtp([...text.split(''), ...Array(OTP_LENGTH - text.length).fill('')]);
            inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
        }
    };

    // ── Step 2: Verify OTP ─────────────────────────────────────────────────
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < OTP_LENGTH) {
            toast.error('Please enter all 6 digits.');
            return;
        }
        setVerifying(true);
        const tid = toast.loading('Verifying code…');
        try {
            const data = await api.post<{ token: string; user: any }>('/api/auth/verify-otp', { email, otp: code });
            // data is result.data from ApiResponse
            localStorage.setItem('token',     data.token);
            localStorage.setItem('userRole',  data.user.role);
            localStorage.setItem('userName',  data.user.name);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userPhone', data.user.phone || '');
            toast.success('Account verified! Welcome to Clean India 🎉', { id: tid });
            const redirectPath = location.state?.from || '/dashboard';
            navigate(redirectPath);
        } catch (err: any) {
            toast.error(err.message || 'Verification failed', { id: tid });
            setOtp(Array(OTP_LENGTH).fill(''));
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } finally {
            setVerifying(false);
        }
    };

    // ── Resend OTP ─────────────────────────────────────────────────────────
    const handleResend = async () => {
        if (countdown > 0 || resending) return;
        setResending(true);
        const tid = toast.loading('Sending new code…');
        try {
            await api.post('/api/auth/resend-otp', { email });
            toast.success('New OTP sent!', { id: tid });
            setCountdown(RESEND_COOLDOWN);
            setOtp(Array(OTP_LENGTH).fill(''));
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } catch (err: any) {
            toast.error(err.message || 'Failed to resend OTP', { id: tid });
        } finally {
            setResending(false);
        }
    };

    // ── Shared header ──────────────────────────────────────────────────────
    const Header = () => (
        <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-[#115e59] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                CI
            </div>
            <h1 className="text-2xl font-bold text-[#115e59] mb-1">Clean India</h1>
            <p className="text-gray-500 text-sm">Smart City Civic Management Platform</p>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2 — OTP Verification screen
    // ═══════════════════════════════════════════════════════════════════════
    if (step === 2) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-sans">
                <Header />
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-full max-w-[420px]">
                    {/* Icon + heading */}
                    <div className="text-center mb-6">
                        <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck className="w-7 h-7 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Verify Your Email</h2>
                        <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                            We sent a 6-digit code to<br />
                            <span className="font-semibold text-gray-700">{email}</span>
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-5">
                        {/* OTP boxes */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-3 text-center">
                                Enter Verification Code
                            </label>
                            <div
                                className="flex gap-2 justify-center"
                                onPaste={handleOtpPaste}
                            >
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => { inputRefs.current[idx] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(idx, e.target.value)}
                                        onKeyDown={e => handleOtpKey(idx, e)}
                                        className="w-11 h-13 text-center text-lg font-bold border-2 rounded-xl transition-all outline-none focus:border-[#115e59] focus:ring-2 focus:ring-[#115e59]/20 bg-gray-50 focus:bg-white"
                                        style={{
                                            height: '52px',
                                            borderColor: digit ? '#115e59' : '#e5e7eb',
                                            color: '#111827',
                                        }}
                                        disabled={verifying}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Verify button */}
                        <button
                            type="submit"
                            disabled={verifying || otp.join('').length < OTP_LENGTH}
                            className="w-full py-2.5 rounded-lg text-white font-semibold text-sm bg-[#115e59] hover:bg-[#0f4d49] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {verifying ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Verifying…
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Verify & Create Account
                                </>
                            )}
                        </button>

                        {/* Resend */}
                        <p className="text-center text-xs text-gray-500">
                            Didn't receive it?{' '}
                            {countdown > 0 ? (
                                <span className="text-gray-400">Resend in <span className="font-semibold text-[#115e59]">{countdown}s</span></span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={resending}
                                    className="text-[#115e59] font-semibold hover:underline disabled:opacity-50"
                                >
                                    {resending ? 'Sending…' : 'Resend OTP'}
                                </button>
                            )}
                        </p>

                        {/* Back */}
                        <p className="text-center text-xs text-gray-400">
                            <button
                                type="button"
                                onClick={() => { setStep(1); setOtp(Array(OTP_LENGTH).fill('')); }}
                                className="hover:underline hover:text-gray-600 transition-colors"
                            >
                                ← Change email / start over
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1 — Registration form
    // ═══════════════════════════════════════════════════════════════════════
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

                        {/* Strength bar */}
                        {password.length > 0 && (
                            <div className="mt-2 space-y-2">
                                {/* Bar */}
                                <div className="flex gap-1">
                                    {[0, 1, 2, 3].map(i => (
                                        <div
                                            key={i}
                                            className="h-1 flex-1 rounded-full transition-all duration-300"
                                            style={{ background: i < passedCount ? strengthColor : '#e5e7eb' }}
                                        />
                                    ))}
                                </div>
                                {/* Rules checklist */}
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
                        disabled={submitting || !allRulesPassed}
                        className="w-full py-2.5 rounded-lg text-white font-semibold text-sm bg-[#115e59] hover:bg-[#0f4d49] transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Sending OTP…
                            </>
                        ) : 'Continue — Send OTP'}
                    </button>
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
