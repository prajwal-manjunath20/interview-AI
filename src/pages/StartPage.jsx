import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interview as interviewApi } from '../services/api';

const ROLES = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Data Scientist',
    'Product Manager', 'UI/UX Designer', 'DevOps Engineer', 'Machine Learning Engineer'];
const DIFFICULTIES = ['Junior', 'Mid', 'Senior'];

export default function StartPage() {
    const [role, setRole] = useState('Software Engineer');
    const [difficulty, setDifficulty] = useState('Mid');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleStart = async () => {
        setError(''); setLoading(true);
        try {
            const data = await interviewApi.start(role, difficulty);
            navigate('/interview', { state: { ...data, role, difficulty } });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px' }}>
            <div className="animate-fade-up">
                <h1 style={{ fontSize: 32, margin: '0 0 8px', fontWeight: 700, color: 'var(--text)' }}>
                    Ready to practice?
                </h1>
                <p style={{ color: 'var(--muted)', fontSize: 16, margin: '0 0 40px' }}>
                    Choose a role and difficulty level. The AI will adapt questions based on your performance.
                </p>
            </div>

            <div className="card animate-fade-up delay-1" style={{ padding: 36 }}>
                <div style={{ marginBottom: 28 }}>
                    <label className="form-label" style={{ fontSize: 15, marginBottom: 10 }}>Job Role</label>
                    <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                <div style={{ marginBottom: 36 }}>
                    <label className="form-label" style={{ fontSize: 15, marginBottom: 10 }}>Difficulty Level</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {DIFFICULTIES.map(d => (
                            <button key={d} onClick={() => setDifficulty(d)}
                                style={{
                                    flex: 1, padding: '12px 0', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 15,
                                    fontWeight: 600, border: difficulty === d ? 'none' : '1.5px solid var(--border)',
                                    background: difficulty === d ? 'var(--primary)' : '#fff',
                                    color: difficulty === d ? '#fff' : 'var(--muted)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                }}>
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ padding: 16, borderRadius: 12, background: 'var(--primary-light)', marginBottom: 28 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--primary)', fontWeight: 500, lineHeight: 1.6 }}>
                        📋 <strong>What to expect:</strong> 5 role-specific questions — mix of technical and behavioral.
                        The AI adjusts difficulty based on your score (relevance + clarity + depth).
                        Each answer gets scored, analyzed, and followed up if needed.
                    </p>
                </div>

                {error && <p style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

                <button className="btn-primary" onClick={handleStart} disabled={loading} style={{ width: '100%', padding: '14px', fontSize: 16 }}>
                    {loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <div className="thinking-dot" /><div className="thinking-dot" /><div className="thinking-dot" />
                            <span style={{ marginLeft: 4 }}>Generating questions…</span>
                        </span>
                    ) : 'Start Interview Session'}
                </button>
            </div>

            {/* Feature summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 24 }}>
                {[
                    { icon: '🎯', label: 'AI Eval', desc: '5 dimensions scored' },
                    { icon: '📊', label: 'Adaptive', desc: 'Difficulty adjusts live' },
                    { icon: '⭐', label: 'STAR', desc: 'Behavioral analysis' },
                ].map(f => (
                    <div key={f.label} className="card animate-fade-up delay-2" style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{f.label}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
