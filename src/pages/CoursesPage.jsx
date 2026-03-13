import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Play, Sparkles, BookOpen, Code, FileQuestion } from 'lucide-react';

export default function CoursesPage() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('Beginner');

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await api.get('/courses');
            setCourses(res);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch courses:', err);
            setLoading(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setGenerating(true);
        try {
            const res = await api.post('/courses/generate', {
                topic, difficulty
            });
            
            navigate(`/course/${res.courseId}`);
        } catch (err) {
            console.error('Failed to generate course:', err);
            // Show the actual validation error if Gemini rejected the topic
            alert(err.message || 'Failed to generate course. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading courses...</div>;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
            <div style={{
                background: '#fff', borderRadius: 16, padding: 32,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: 40
            }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={24} color="var(--primary)" /> Let AI Build Your Curriculum
                </h2>
                <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
                    Enter any topic, and our AI will generate a complete course with reading materials, an MCQ quiz, and a practical coding challenge.
                </p>

                <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <input 
                            type="text" 
                            className="input-field"
                            placeholder="e.g., Node.js Event Loop, React Hooks, Dynamic Programming..."
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            required
                        />
                    </div>
                    <select 
                        className="input-field" 
                        style={{ width: 150 }}
                        value={difficulty}
                        onChange={e => setDifficulty(e.target.value)}
                    >
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                    </select>
                    <button type="submit" className="btn-primary" disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {generating ? 'Generating...' : <><Sparkles size={18} /> Generate Course</>}
                    </button>
                </form>
                {generating && (
                    <div style={{ marginTop: 16, fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>
                        <div className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginRight: 8, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        Our AI is crafting your materials, questions, and coding challenges. This may take a minute...
                    </div>
                )}
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Your Courses</h3>
            
            {courses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16, border: '1px dashed var(--border)' }}>
                    <BookOpen size={48} color="var(--border)" style={{ margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--muted)' }}>You haven't generated any courses yet.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                    {courses.map(course => (
                        <div key={course.id} onClick={() => navigate(`/course/${course.id}`)}
                            style={{
                                background: '#fff', borderRadius: 12, padding: 24,
                                border: '1px solid var(--border)', cursor: 'pointer',
                                transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <span style={{
                                    fontSize: 12, fontWeight: 600, color: 'var(--primary)',
                                    background: 'var(--primary-light)', padding: '4px 8px', borderRadius: 6
                                }}>
                                    {course.difficulty}
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <BookOpen size={16} color="var(--muted)" />
                                    <FileQuestion size={16} color="var(--muted)" />
                                    <Code size={16} color="var(--muted)" />
                                </div>
                            </div>
                            <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
                                {course.topic}
                            </h4>
                            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                                Generated on {new Date(course.created_at).toLocaleDateString()}
                            </p>
                            
                            <button className="btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                                <Play size={16} /> Continue Learning
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
