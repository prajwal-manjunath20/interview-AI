import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { analytics as analyticsApi } from '../services/api';

export default function SummaryPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { sessionId, role, difficulty } = location.state || {};
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        analyticsApi.getSessions().then(data => {
            const session = data.sessions?.find(s => s.id === sessionId);
            setSessionData(session || null);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [sessionId]);

    const answers = sessionData?.answers || [];
    const overallScore = sessionData?.overall_score || 0;
    const scoreColor = overallScore >= 7 ? '#2A9D8F' : overallScore >= 4 ? '#F4A261' : '#E63946';

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px' }}>
            <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>
                    {overallScore >= 7 ? '🎯' : overallScore >= 4 ? '👍' : '📚'}
                </div>
                <h1 style={{ fontSize: 30, margin: '0 0 6px', color: 'var(--text)' }}>Session Complete</h1>
                <p style={{ color: 'var(--muted)', margin: 0 }}>{role} · {difficulty} level</p>
            </div>

            {/* Overall score */}
            <div className="card animate-fade-up" style={{ padding: 32, textAlign: 'center', marginBottom: 20 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Overall Score</p>
                <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, color: scoreColor }}>
                    {loading ? '–' : overallScore.toFixed(1)}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--muted)' }}>out of 10</p>
            </div>

            {/* Per-question breakdown */}
            {!loading && answers.length > 0 && (
                <div className="card animate-fade-up" style={{ padding: 28, marginBottom: 20 }}>
                    <h2 style={{ margin: '0 0 20px', fontSize: 17, color: 'var(--text)' }}>Question Breakdown</h2>
                    {answers.map((a, i) => {
                        const qScore = a.relevance != null ? Math.round(((a.relevance + a.clarity + a.depth) / 3) * 10) / 10 : null;
                        const qColor = qScore != null ? (qScore >= 7 ? '#2A9D8F' : qScore >= 4 ? '#F4A261' : '#E63946') : '#9CA3AF';
                        return (
                            <div key={i} style={{ padding: '16px 0', borderBottom: i < answers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: '50%', background: `${qColor}18`, border: `2px solid ${qColor}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: qColor }}>{i + 1}</span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                                            {a.question?.slice(0, 100)}{a.question?.length > 100 ? '…' : ''}
                                        </p>
                                        {a.feedback && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{a.feedback.slice(0, 120)}…</p>}
                                    </div>
                                    {qScore != null && <span style={{ fontWeight: 700, fontSize: 16, color: qColor, flexShrink: 0 }}>{qScore}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button className="btn-ghost" onClick={() => navigate('/')} style={{ padding: '14px' }}>
                    ↩ New Interview
                </button>
                <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                    <button className="btn-primary" style={{ width: '100%', padding: '14px' }}>
                        View Analytics →
                    </button>
                </Link>
            </div>
        </div>
    );
}
