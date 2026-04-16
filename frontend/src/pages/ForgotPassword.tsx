import { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
            } else {
                setErrorMessage(data?.message || 'Something went wrong. Please try again.');
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
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Check your inbox</h2>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            If an account with <span className="font-semibold text-gray-700">{email}</span> exists, we've sent a password reset link to that address. The link expires in <span className="font-semibold">1 hour</span>.
                        </p>
                        <p className="text-xs text-gray-400 mb-6">
                            Didn't receive it? Check your spam folder or{' '}
                            <button
                                onClick={() => { setStatus('idle'); setEmail(''); }}
                                className="text-[#115e59] font-medium hover:underline"
                            >
                                try again
                            </button>.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#115e59] hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Sign In
                        </Link>
                    </div>
                ) : (
                    /* Form State */
                    <>
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Forgot Password?</h2>
                            <p className="text-gray-500 text-sm">
                                Enter your registered email and we'll send you a link to reset your password.
                            </p>
                        </div>

                        {status === 'error' && (
                            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all"
                                        required
                                        disabled={status === 'loading'}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-2.5 rounded-lg text-white font-medium text-sm bg-[#115e59] hover:bg-[#0f4d49] transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Sending Reset Link...
                                    </>
                                ) : 'Send Reset Link'}
                            </button>
                        </form>

                        <p className="text-center text-xs text-gray-500 mt-6">
                            Remember your password?{' '}
                            <Link to="/login" className="text-[#115e59] font-medium hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
