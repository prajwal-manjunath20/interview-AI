import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Navbar from '../components/Navbar';

export default function ProtectedLayout() {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <main><Outlet /></main>
        </div>
    );
}
