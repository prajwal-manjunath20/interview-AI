import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analytics as analyticsApi } from '../services/api';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, Cell,
} from 'recharts';

const COLORS = ['#2A9D8F', '#8B5CF6', '#F4A261', '#06B6D4', '#22C55E'];

function Section({ title, children, style }) {
    return (
        <div className="card animate-fade-up" style={{ padding: 28, ...style }}>
            {title && <h2 style={{ margin: '0 0 20px', fontSize: 17, color: 'var(--text)' }}>{title}</h2>}
            {children}
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text)' }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ margin: '2px 0', color: p.color }}>
                    {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
                </p>
            ))}
        </div>
    );
}

export default function DashboardPage() {
    const [perf, setPerf] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([analyticsApi.getPerformance(), analyticsApi.getSessions()])
            .then(([p, s]) => { setPerf(p); setSessions(s.sessions || []); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}><div className="thinking-dot" /><div className="thinking-dot" /><div className="thinking-dot" /></div>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading analytics…</p>
            </div>
        );
    }

    if (!sessions.length) {
        return (
            <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <h2 style={{ margin: '0 0 8px', color: 'var(--text)' }}>No sessions yet</h2>
                <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Complete an interview session to see your analytics and track improvement over time.</p>
                <button className="btn-primary" onClick={() => navigate('/')}>Start your first interview</button>
            </div>
        );
    }

    // Radar data
    const radarData = perf?.averages ? [
        { subject: 'Relevance', A: parseFloat(perf.averages.avg_relevance) || 0 },
        { subject: 'Clarity', A: parseFloat(perf.averages.avg_clarity) || 0 },
        { subject: 'Depth', A: parseFloat(perf.averages.avg_depth) || 0 },
        { subject: 'Structure', A: parseFloat(perf.averages.avg_structure) || 0 },
        { subject: 'Confidence', A: parseFloat(perf.averages.avg_confidence) || 0 },
    ] : [];

    // Line chart — score over sessions
    const lineData = (perf?.trend || []).map((s, i) => ({
        session: `S${i + 1}`,
        score: parseFloat(s.overall_score) || 0,
        role: s.role,
    }));

    // Bar chart — latest session breakdown
    function buildBarData(breakdown) {
        if (!breakdown || !breakdown.length) return [];
        const last = breakdown[breakdown.length - 1];
        return ['relevance', 'clarity', 'depth', 'structure', 'confidence'].map((k, i) => ({
            name: k.charAt(0).toUpperCase() + k.slice(1),
            value: parseFloat(last[k]) || 0,
            color: COLORS[i],
        }));
    }
    const barData = buildBarData(perf?.sessionBreakdown);

    const bestScore = Math.max(...sessions.map(s => s.overall_score || 0));


    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
            <div className="animate-fade-up" style={{ marginBottom: 36 }}>
                <h1 style={{ fontSize: 28, margin: '0 0 6px', color: 'var(--text)' }}>Your Progress</h1>
                <p style={{ color: 'var(--muted)', margin: 0 }}>Track improvement across all interview sessions</p>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Sessions', value: sessions.length, icon: '🗂', color: '#2A9D8F' },
                    { label: 'Best Score', value: bestScore.toFixed(1), icon: '🏆', color: '#F4A261' },
                    { label: 'Avg Score', value: lineData.length ? (lineData.reduce((s, d) => s + d.score, 0) / lineData.length).toFixed(1) : '—', icon: '📈', color: '#8B5CF6' },
                ].map(c => (
                    <Section key={c.label}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 28 }}>{c.icon}</span>
                            <div>
                                <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</p>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{c.label}</p>
                            </div>
                        </div>
                    </Section>
                ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Radar */}
                <Section title="Skill Averages">
                    <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="#F3F4F6" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 12 }} />
                            <PolarRadiusAxis domain={[0, 10]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                            <Radar name="Score" dataKey="A" stroke="#2A9D8F" fill="#2A9D8F" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                    </ResponsiveContainer>
                </Section>

                {/* Bar — latest session */}
                <Section title="Latest Session">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barData} barSize={28}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 10]} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Section>
            </div>

            {/* Line chart */}
            {lineData.length > 1 && (
                <Section title="Progress Over Time" style={{ marginBottom: 20 }}>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="session" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 10]} tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 13, color: '#6B7280' }} />
                            <Line type="monotone" dataKey="score" name="Score" stroke="#2A9D8F" strokeWidth={2.5}
                                dot={{ fill: '#2A9D8F', r: 4 }} activeDot={{ r: 6, fill: '#F4A261' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Section>
            )}

            {/* Session history table */}
            <Section title="Session History">
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Date', 'Role', 'Difficulty', 'Score', 'Questions'].map(h => (
                                    <th key={h} style={{ textAlign: 'left', padding: '0 12px 12px 0', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...sessions].reverse().map((s, i) => {
                                const sc = parseFloat(s.overall_score || 0);
                                const col = sc >= 7 ? '#2A9D8F' : sc >= 4 ? '#F4A261' : '#E63946';
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                                        <td style={{ padding: '12px 12px 12px 0', color: 'var(--muted)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '12px 12px 12px 0', color: 'var(--text)' }}>{s.role}</td>
                                        <td style={{ padding: '12px 12px 12px 0' }}><span className="pill pill-teal">{s.difficulty}</span></td>
                                        <td style={{ padding: '12px 12px 12px 0', fontWeight: 700, color: col }}>{sc.toFixed(1)}</td>
                                        <td style={{ padding: '12px 0', color: 'var(--muted)' }}>{s.question_count || 0}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Section>
        </div>
    );
}
