import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) { setError('Passwords do not match'); return; }
        setLoading(true);
        try {
            await register(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
            <div className="card animate-fade-up" style={{ width: '100%', maxWidth: 420, padding: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--primary), #1a7a6f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 700 }}>I</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>InterviewAI</span>
                </div>
                <h1 style={{ fontSize: 24, margin: '0 0 6px', color: 'var(--text)' }}>Create your account</h1>
                <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 28px' }}>Start practicing interviews with AI coaching</p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 16 }}>
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label className="form-label">Password <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(min. 6 chars)</span></label>
                        <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <label className="form-label">Confirm password</label>
                        <input className="form-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
                    </div>
                    {error && <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 16, padding: '10px 14px', background: '#fef2f2', borderRadius: 8 }}>{error}</p>}
                    <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Creating account…' : 'Get started free'}
                    </button>
                </form>
                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}
