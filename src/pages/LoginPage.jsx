import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthCard({ title, subtitle, children }) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
            <div className="card animate-fade-up" style={{ width: '100%', maxWidth: 420, padding: 40 }}>
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--primary), #1a7a6f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#fff', fontWeight: 700 }}>I</span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>InterviewAI</span>
                    </div>
                    <h1 style={{ fontSize: 24, margin: 0, color: 'var(--text)' }}>{title}</h1>
                    <p style={{ fontSize: 14, color: 'var(--muted)', margin: '6px 0 0' }}>{subtitle}</p>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthCard title="Welcome back" subtitle="Sign in to continue your interview practice">
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
                </div>
                <div style={{ marginBottom: 24 }}>
                    <label className="form-label">Password</label>
                    <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                {error && <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 16, padding: '10px 14px', background: '#fef2f2', borderRadius: 8 }}>{error}</p>}
                <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                    {loading ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
                No account? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 500 }}>Create one free</Link>
            </p>
        </AuthCard>
    );
}
