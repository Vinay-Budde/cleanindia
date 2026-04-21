import { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const Login = () => {
    const location = useLocation();
    const isAdminPath = location.pathname.startsWith('/admin');
    const [role] = useState<'citizen' | 'admin'>(isAdminPath ? 'admin' : 'citizen');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const tid = toast.loading('Signing in...');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            }

            if (response.ok && data) {
                const result = data.data;
                const user = result.user;

                localStorage.setItem('token', result.token);
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('userName', user.name);
                localStorage.setItem('userEmail', user.email);
                localStorage.setItem('userPhone', user.phone || '');

                toast.success('Login successful!', { id: tid });

                if (user.role === 'admin') {
                    navigate('/admin/dashboard');
                } else if (user.role === 'worker') {
                    navigate('/worker/dashboard');
                } else {
                    const redirectPath = location.state?.from || '/dashboard';
                    navigate(redirectPath);
                }
            } else {
                const errorMessage = data?.message || (response.status === 429 ? 'Too many requests. Please slow down.' : 'Invalid credentials or server error');
                toast.error(errorMessage, { id: tid });
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Server error. Please try again.', { id: tid });
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-sans">
            {/* Header section */}
            <div className="text-center mb-8">
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 ${role === 'admin' ? 'bg-[#ea580c]' : 'bg-[#115e59]'}`}>
                    CI
                </div>
                <h1 className="text-2xl font-bold text-[#115e59] mb-1">Clean India</h1>
                <p className="text-gray-500 text-sm">{role === 'admin' ? 'Administrator Portal' : 'Smart City Civic Management Platform'}</p>
            </div>

            {/* Login Card */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-full max-w-[400px]">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{role === 'admin' ? 'Admin Login' : 'Welcome Back'}</h2>
                    <p className="text-gray-500 text-sm mt-1">{role === 'admin' ? 'Portal management access' : 'Sign in to access your account'}</p>
                </div>

                {/* Form */}
                <form className="space-y-4" onSubmit={handleLogin} autoComplete="off">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            {role === 'citizen' ? 'Email' : 'Admin Email'}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={role === 'citizen' ? 'Enter your email' : 'Enter admin email'}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all"
                                required
                                minLength={8}
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="flex justify-end mt-1.5">
                            <Link
                                to="/forgot-password"
                                className="text-xs text-[#115e59] font-medium hover:underline"
                            >
                                Forgot Password?
                            </Link>
                        </div>
                    </div>


                    <button
                        type="submit"
                        className={`w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors mt-2 ${role === 'citizen'
                            ? 'bg-[#115e59] hover:bg-[#0f4d49]'
                            : 'bg-[#ea580c] hover:bg-[#c2410c]'
                            }`}
                    >
                        Sign In as {role === 'citizen' ? 'Citizen' : 'Admin'}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-500 mt-6">
                    {!isAdminPath && (
                        <>
                            Don't have an account?{' '}
                            <Link to="/signup" state={location.state} className="text-[#115e59] font-medium hover:underline">
                                Sign Up
                            </Link>
                        </>
                    )}
                    {isAdminPath && (
                        <span className="text-gray-400">Admin accounts are managed by the system.</span>
                    )}
                </p>
            </div>
        </div>
    );
};

export default Login;
