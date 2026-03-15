import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import { Bell, User as UserIcon, Home, Plus, FileText, Trophy, Facebook, Twitter, Youtube, LayoutDashboard, Settings, LogOut, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface LayoutProps {
    children: ReactNode;
    type?: 'citizen' | 'admin';
}

const Layout = ({ children, type = 'citizen' }: LayoutProps) => {
    const location = useLocation();

    const citizenNavItems = [
        { path: '/dashboard', icon: Home, label: 'Home' },
        { path: '/report', icon: Plus, label: 'Report Issue' },
        { path: '/complaints', icon: FileText, label: 'My Complaints' },
        { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    ];

    const adminNavItems = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/complaints', icon: FileText, label: 'Manage Complaints' },
    ];

    const navItems = type === 'admin' ? adminNavItems : citizenNavItems;

    // Get real details from local storage
    const userName = localStorage.getItem('userName') || (type === 'admin' ? 'Admin User' : 'Rajesh Kumar');
    const userRole = localStorage.getItem('userRole') || type;

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const userEmail = localStorage.getItem('userEmail');

    const fetchNotifications = async () => {
        if (!userEmail) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-auth-token': token || ''
                }
            });
            
            if (res.ok) {
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) return;

                const data = await res.json();
                const items = data.data || [];

                // Check for new notifications to show toast
                if (notifications.length > 0 && items.length > notifications.length) {
                    const newNotifs = items.filter((n: any) => !notifications.find((old: any) => old._id === n._id));
                    newNotifs.forEach((n: any) => {
                        toast(n.message, {
                            icon: n.type === 'success' ? '✅' : (n.type === 'warning' ? '⚠️' : '🔔'),
                            duration: 4000
                        });
                    });
                }

                setNotifications(items);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000); // poll every 15 seconds
        return () => clearInterval(interval);
    }, [userRole, userEmail]);

    const handleNotifClick = async () => {
        setIsNotifOpen(!isNotifOpen);
        if (!isNotifOpen && unreadCount > 0) {
            try {
                const token = localStorage.getItem('token');
                await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications/read`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'x-auth-token': token || ''
                    }
                });
                setNotifications(notifications.map(n => ({ ...n, read: true })));
            } catch (error) {
                console.error('Error marking as read', error);
            }
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        // Clear any local storage/session tokens here in the future
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-gray-900">
            {/* Top Header */}
            <header className="bg-white px-6 py-3 flex items-center justify-between">
                <Link to={type === 'admin' ? '/admin/dashboard' : '/dashboard'} className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                    <div className="w-10 h-10 bg-[#115e59] rounded-full flex items-center justify-center text-white font-bold">
                        CI
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#115e59] leading-tight">Clean India</h1>
                        <p className="text-xs text-gray-500">Smart City Civic Management Platform</p>
                    </div>
                </Link>

                <div className="flex items-center gap-6">
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={handleNotifClick}
                            className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none"
                        >
                            <Bell className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-[#ea580c] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {isNotifOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 max-h-96 overflow-y-auto">
                                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900">Notifications</h3>
                                    {unreadCount > 0 && <span className="text-xs text-[#115e59] bg-emerald-50 px-2 py-1 rounded-full">{unreadCount} new</span>}
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                                            No new notifications
                                        </div>
                                    ) : (
                                        notifications.map((notif: any) => (
                                            <div key={notif._id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-emerald-50/30' : ''}`}>
                                                <div className="flex gap-3">
                                                    <div className="flex-shrink-0 mt-0.5">
                                                        {notif.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                                        {notif.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                                                        {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-800 leading-snug">{notif.message}</p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none"
                        >
                            <div className="w-9 h-9 bg-[#115e59] rounded-full flex items-center justify-center text-white">
                                <UserIcon className="w-5 h-5" />
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-sm font-semibold leading-tight text-gray-900">{userName}</p>
                                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-[#115e59] transition-colors"
                                    onClick={() => setIsProfileOpen(false)}
                                >
                                    <UserIcon className="w-4 h-4" /> View Profile
                                </Link>
                                <Link
                                    to="/settings"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-[#115e59] transition-colors"
                                    onClick={() => setIsProfileOpen(false)}
                                >
                                    <Settings className="w-4 h-4" /> Settings
                                </Link>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                >
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Orange Divider */}
            <div className="h-[2px] w-full bg-[#f97316]"></div>

            {/* Navigation Bar */}
            <nav className={`px-6 py-2 shadow-sm sticky top-0 z-30 ${type === 'admin' ? 'bg-[#115e59]' : 'bg-white'}`}>
                <ul className="flex items-center gap-2 max-w-7xl mx-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');

                        if (type === 'admin') {
                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                            ? 'bg-white text-[#115e59]'
                                            : 'text-white hover:bg-[#0f4d49]'
                                            }`}
                                    >
                                        <item.icon className={`w-4 h-4 ${isActive ? 'text-[#115e59]' : 'text-emerald-100'}`} />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        }

                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                        ? 'bg-[#115e59] text-white'
                                        : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12 py-12 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-[#115e59] font-bold text-lg mb-4">About Clean India</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            A smart city platform empowering citizens and municipal corporations for efficient civic issue management.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-[#115e59] font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link to="#" className="hover:text-[#115e59] transition-colors">About Us</Link></li>
                            <li><Link to="#" className="hover:text-[#115e59] transition-colors">Privacy Policy</Link></li>
                            <li><Link to="#" className="hover:text-[#115e59] transition-colors">Terms of Service</Link></li>
                            <li><Link to="#" className="hover:text-[#115e59] transition-colors">Help & FAQ</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-[#115e59] font-semibold mb-4">Contact Us</h3>
                        <ul className="space-y-3 text-sm text-gray-500">
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 text-gray-400">📞</span> 1800-XXX-XXXX (Toll Free)
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 text-gray-400">✉️</span> support@cleanindia.gov.in
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 text-gray-400">📍</span> New Delhi, India
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-[#115e59] font-semibold mb-4">Follow Us</h3>
                        <div className="flex gap-3">
                            <a href="#" className="w-8 h-8 rounded-full bg-[#115e59] text-white flex items-center justify-center hover:bg-[#0f4d49] transition-colors">
                                <Facebook className="w-4 h-4" />
                            </a>
                            <a href="#" className="w-8 h-8 rounded-full bg-[#115e59] text-white flex items-center justify-center hover:bg-[#0f4d49] transition-colors">
                                <Twitter className="w-4 h-4" />
                            </a>
                            <a href="#" className="w-8 h-8 rounded-full bg-[#115e59] text-white flex items-center justify-center hover:bg-[#0f4d49] transition-colors">
                                <Youtube className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between text-xs text-gray-400">
                    <p>© 2026 Clean India. All rights reserved.</p>
                    <p>Smart City Civic Management Platform</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
