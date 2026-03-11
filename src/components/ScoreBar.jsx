export default function ScoreBar({ label, value = 0, max = 10, color = 'var(--primary)' }) {
    const pct = Math.min(100, (value / max) * 100);
    const displayColor = value >= 7 ? '#2A9D8F' : value >= 4 ? '#F4A261' : '#E63946';
    const barColor = color === 'var(--primary)' ? displayColor : color;

    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: barColor }}>{value}/{max}</span>
            </div>
            <div className="score-bar-track">
                <div className="score-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
            </div>
        </div>
    );
}
