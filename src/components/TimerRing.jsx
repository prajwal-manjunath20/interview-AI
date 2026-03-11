export default function TimerRing({ seconds = 120, total = 120, size = 72 }) {
    const r = (size / 2) - 5;
    const circ = 2 * Math.PI * r;
    const progress = (seconds / total) * circ;
    const urgent = seconds <= 30;
    const color = urgent ? '#E63946' : 'var(--primary)';

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={4} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
                    strokeWidth={4} strokeLinecap="round"
                    strokeDasharray={circ} strokeDashoffset={circ - progress}
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
            </svg>
            <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
            }}>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'IBM Plex Sans, monospace', color }}>
                    {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
                </span>
            </div>
        </div>
    );
}
