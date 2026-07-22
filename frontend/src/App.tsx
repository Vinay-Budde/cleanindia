import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ReportIssue from './pages/ReportIssue';
import MyComplaints from './pages/MyComplaints';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import ManageComplaints from './pages/ManageComplaints';
import MunicipalityManager from './pages/MunicipalityManager';
import InviteOfficer from './pages/InviteOfficer';
import AcceptInvite from './pages/AcceptInvite';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Layout from './components/Layout';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';

const OFFICER_ROLES = ['super_admin', 'state_admin', 'commissioner', 'zone_officer', 'ward_officer', 'field_inspector', 'admin'];
const getUserRole = () => localStorage.getItem('userRole') || 'citizen';
const isOfficer = () => OFFICER_ROLES.includes(getUserRole());

const AdminDashboardWrapper = () => {
  const role = getUserRole();
  if (role === 'super_admin' || role === 'admin') {
    return <AdminDashboard />;
  }
  return <OfficerDashboard />;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />

        {/* /admin → redirect to /admin/dashboard if already logged in as officer, else show login */}
        <Route
          path="/admin"
          element={
            localStorage.getItem('token') && isOfficer()
              ? <Navigate to="/admin/dashboard" replace />
              : <Login />
          }
        />

        {/* Admin/Officer routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboardWrapper /></ProtectedRoute>} />
        <Route path="/admin/complaints" element={<ProtectedRoute role="admin"><ManageComplaints /></ProtectedRoute>} />
        <Route path="/admin/municipalities" element={<ProtectedRoute role="admin"><MunicipalityManager /></ProtectedRoute>} />
        <Route path="/admin/invite-officer" element={<ProtectedRoute role="admin"><InviteOfficer /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><Analytics /></ProtectedRoute>} />

        {/* Citizen routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} />
        <Route path="/complaints" element={<ProtectedRoute><MyComplaints /></ProtectedRoute>} />

        {/* Shared protected routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout type={isOfficer() ? 'admin' : 'citizen'}>
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
