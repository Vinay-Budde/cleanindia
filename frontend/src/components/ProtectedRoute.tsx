import { Navigate, useLocation } from 'react-router-dom';

const OFFICER_ROLES = ['super_admin', 'state_admin', 'commissioner', 'zone_officer', 'ward_officer', 'field_inspector', 'admin'];

interface ProtectedRouteProps {
    children: React.ReactNode;
    role?: 'admin' | 'worker' | 'citizen';
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole') || 'citizen';
    const location = useLocation();

    // Not authenticated — send to login
    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const isOfficer = OFFICER_ROLES.includes(userRole);

    // Route requires 'admin' (officer) and user is not an officer
    if (role === 'admin' && !isOfficer) {
        return <Navigate to="/dashboard" replace />;
    }

    // Route is citizen-only (no role prop) but user is officer — redirect them to admin area
    if (!role && isOfficer) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
