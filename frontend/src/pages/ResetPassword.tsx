import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(!token ? 'error' : 'idle');
    const [errorMessage, setErrorMessage] = useState(!token ? 'No reset token found. Please request a new password reset link.' : '');

    const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
    const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters.');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
            } else {
                setErrorMessage(data?.message || 'Invalid or expired token. Please request a new reset link.');
                setStatus('error');
            }
        } catch {
            setErrorMessage('Network error. Please check your connection and try again.');
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-sans">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-[#115e59] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                    CI
                </div>
                <h1 className="text-2xl font-bold text-[#115e59] mb-1">Clean India</h1>
                <p className="text-gray-500 text-sm">Smart City Civic Management Platform</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-full max-w-[400px]">

                {status === 'success' ? (
                    /* Success State */
                    <div className="text-center py-4">
                        <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-7 h-7 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Password Reset!</h2>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            Your password has been updated successfully. You can now sign in with your new password.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-2.5 rounded-lg text-white font-medium text-sm bg-[#115e59] hover:bg-[#0f4d49] transition-colors"
                        >
                            Go to Sign In
                        </button>
                    </div>

                ) : !token || (status === 'error' && !token) ? (
                    /* Invalid / Missing Token State */
                    <div className="text-center py-4">
                        <div className="mx-auto w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                            <XCircle className="w-7 h-7 text-red-500" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Invalid Link</h2>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            This password reset link is missing or invalid. Please request a new one.
                        </p>
                        <Link
                            to="/forgot-password"
                            className="w-full inline-block text-center py-2.5 rounded-lg text-white font-medium text-sm bg-[#115e59] hover:bg-[#0f4d49] transition-colors"
                        >
                            Request New Link
                        </Link>
                    </div>

                ) : (
                    /* Form State */
                    <>
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Set New Password</h2>
                            <p className="text-gray-500 text-sm">
                                Choose a strong password for your account.
                            </p>
                        </div>

                        {status === 'error' && errorMessage && (
                            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* New Password */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min. 8 characters"
                                        className={`w-full pl-9 pr-10 py-2 bg-gray-50 border rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                            passwordTooShort
                                                ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                                                : 'border-gray-200 focus:ring-[#115e59]/20 focus:border-[#115e59]'
                                        }`}
                                        required
                                        minLength={8}
                                        disabled={status === 'loading'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {passwordTooShort && (
                                    <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters.</p>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter your password"
                                        className={`w-full pl-9 pr-10 py-2 bg-gray-50 border rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                            confirmPassword.length > 0
                                                ? passwordsMatch
                                                    ? 'border-emerald-300 focus:ring-emerald-200 focus:border-emerald-400'
                                                    : 'border-red-300 focus:ring-red-200 focus:border-red-400'
                                                : 'border-gray-200 focus:ring-[#115e59]/20 focus:border-[#115e59]'
                                        }`}
                                        required
                                        disabled={status === 'loading'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {confirmPassword.length > 0 && !passwordsMatch && (
                                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                                )}
                                {passwordsMatch && (
                                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Passwords match
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading' || !passwordsMatch || passwordTooShort}
                                className="w-full py-2.5 rounded-lg text-white font-medium text-sm bg-[#115e59] hover:bg-[#0f4d49] transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Resetting Password...
                                    </>
                                ) : 'Reset Password'}
                            </button>
                        </form>

                        <p className="text-center text-xs text-gray-500 mt-6">
                            <Link to="/forgot-password" className="text-[#115e59] font-medium hover:underline">
                                Request a new reset link
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
