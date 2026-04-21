import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    role?: 'admin' | 'worker' | 'citizen';
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const location = useLocation();

    // Not authenticated — send to login
    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Route requires a specific role and user doesn't have it
    if (role && userRole !== role) {
        if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
        if (userRole === 'worker') return <Navigate to="/worker/dashboard" replace />;
        return <Navigate to="/dashboard" replace />;
    }

    // Route is citizen-only (no role prop) but user is admin — redirect them to admin area
    if (!role && userRole === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
