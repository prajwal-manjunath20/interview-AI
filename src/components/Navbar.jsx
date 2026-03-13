import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => { logout(); navigate('/login'); };

    const navLink = (to, label) => {
        const active = location.pathname === to;
        return (
            <Link to={to} style={{
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
                color: active ? 'var(--primary)' : 'var(--muted)',
                padding: '6px 14px', borderRadius: 8,
                background: active ? 'var(--primary-light)' : 'transparent',
                transition: 'all 0.15s',
            }}>{label}</Link>
        );
    };

    return (
        <nav style={{
            background: '#fff', borderBottom: '1px solid var(--border)',
            padding: '0 32px', height: 60, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50,
        }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'linear-gradient(135deg, var(--primary), #1a7a6f)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>I</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                    InterviewAI
                </span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {navLink('/', 'Practice')}
                {navLink('/courses', 'Courses')}
                {navLink('/dashboard', 'Dashboard')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.email}</span>
                <button onClick={handleLogout} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }}>
                    Log out
                </button>
            </div>
        </nav>
    );
}
