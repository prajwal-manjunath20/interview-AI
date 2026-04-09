import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { BookOpen, FileQuestion, Code, CheckCircle, ChevronRight, Play } from 'lucide-react';

export default function CoursePlayerPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState({ type: 'material', id: 0 }); // type: material, quiz, challenge
    
    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                const res = await api.get(`/courses/${id}`);
                setData(res);
                if (res.materials?.length > 0) {
                    setActiveTab({ type: 'material', id: res.materials[0].id });
                }
            } catch (err) {
                console.error(err);
                alert('Failed to load course');
            } finally {
                setLoading(false);
            }
        };
        fetchCourseData();
    }, [id]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading course...</div>;
    if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Course not found</div>;

    const { course, materials, mcqs, challenges } = data;

    // Component for Markdown Material
    const MaterialView = ({ material }) => (
        <div style={{ padding: '0 24px 40px', maxWidth: 800, margin: '0 auto' }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                {material.title}
            </h1>
            <div className="prose">
                <ReactMarkdown>{material.content_markdown}</ReactMarkdown>
            </div>
            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => {
                    const nextIdx = materials.findIndex(m => m.id === material.id) + 1;
                    if (nextIdx < materials.length) setActiveTab({ type: 'material', id: materials[nextIdx].id });
                    else setActiveTab({ type: 'quiz', id: 'all' });
                }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Next <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );

    // Component for Quiz
    const QuizView = () => {
        const [answers, setAnswers] = useState({});
        const [submitted, setSubmitted] = useState(false);
        const [score, setScore] = useState(0);

        const handleSubmit = async () => {
            let s = 0;
            mcqs.forEach((q, i) => {
                if (answers[i] === q.correct_answer) s++;
            });
            setScore(s);
            setSubmitted(true);
            try {
                await api.put(`/courses/${id}/progress`, {
                    quiz_score: s
                });
            } catch (err) { console.error(err); }
        };

        return (
            <div style={{ padding: '0 24px 40px', maxWidth: 800, margin: '0 auto' }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Knowledge Check</h2>
                {mcqs.map((q, i) => (
                    <div key={q.id} style={{ marginBottom: 32, background: '#fff', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
                        <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>{i + 1}. {q.question}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {q.options.map((opt, j) => {
                                const isSelected = answers[i] === opt;
                                const isCorrect = opt === q.correct_answer;
                                let bg = isSelected ? 'var(--primary-light)' : '#f9fafb';
                                let border = isSelected ? 'var(--primary)' : 'var(--border)';
                                if (submitted) {
                                    if (isCorrect) { bg = '#d1fae5'; border = '#10b981'; }
                                    else if (isSelected) { bg = '#fee2e2'; border = '#ef4444'; }
                                }
                                return (
                                    <label key={j} style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                                        background: bg, border: `1px solid ${border}`, borderRadius: 8,
                                        cursor: submitted ? 'default' : 'pointer', transition: 'all 0.2s'
                                    }}>
                                        <input type="radio" name={`q-${i}`} value={opt} checked={isSelected}
                                            onChange={() => !submitted && setAnswers({ ...answers, [i]: opt })}
                                            disabled={submitted} style={{ width: 16, height: 16 }} />
                                        <span style={{ fontSize: 15, color: 'var(--text)' }}>{opt}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {submitted && (
                            <div style={{ marginTop: 16, padding: 16, background: '#f0fdf4', borderRadius: 8, color: '#166534', fontSize: 14 }}>
                                <strong>Explanation:</strong> {q.explanation}
                            </div>
                        )}
                    </div>
                ))}
                {!submitted ? (
                    <button onClick={handleSubmit} className="btn-primary" style={{ width: '100%' }}>Submit Quiz</button>
                ) : (
                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>You scored {score} / {mcqs.length}</h3>
                        {challenges.length > 0 && (
                            <button onClick={() => setActiveTab({ type: 'challenge', id: challenges[0].id })} className="btn-primary">
                                Continue to Coding Challenge <ChevronRight size={18} style={{ display: 'inline', verticalAlign: 'middle' }} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Component for Coding Challenge
    const ChallengeView = ({ challenge }) => {
        const [code, setCode] = useState(challenge.starter_code);
        const [evaluating, setEvaluating] = useState(false);
        const [result, setResult] = useState(null);

        // Update code when challenge changes
        useEffect(() => {
            setCode(challenge.starter_code);
            setResult(null);
        }, [challenge]);

        const handleRun = async () => {
            setEvaluating(true);
            setResult(null);
            try {
                const res = await api.post(`/courses/evaluate-code`, {
                    challengeId: challenge.id,
                    code
                });
                setResult(res);
                if (res.passed) {
                    await api.put(`/courses/${course.id}/progress`, {
                        completed_challenges: [challenge.id]
                    });
                }
            } catch (err) {
                console.error(err);
                alert('Evaluation failed');
            } finally {
                setEvaluating(false);
            }
        };

        const ext = challenge.language.toLowerCase() === 'python' ? python() : javascript();

        return (
            <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
                {/* Left Panel: Problem Description */}
                <div style={{ flex: '1 1 40%', borderRight: '1px solid var(--border)', overflowY: 'auto', padding: 24, background: '#fff' }}>
                    <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>{challenge.title}</h2>
                    <div className="prose" style={{ fontSize: 14 }}>
                        <ReactMarkdown>{challenge.problem_statement}</ReactMarkdown>
                    </div>
                </div>

                {/* Right Panel: Code Editor */}
                <div style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 16px', background: '#1e1e1e', color: '#ccc', fontSize: 13, borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{challenge.language === 'python' ? 'Python 3' : 'JavaScript (Node.js)'}</span>
                        <button onClick={handleRun} disabled={evaluating} style={{
                            background: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4,
                            cursor: evaluating ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
                        }}>
                            {evaluating ? 'Running...' : <><Play size={14} /> Run Code</>}
                        </button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        <CodeMirror
                            value={code}
                            height="100%"
                            theme={vscodeDark}
                            extensions={[ext]}
                            onChange={(value) => setCode(value)}
                            style={{ fontSize: 14, fontFamily: 'monospace' }}
                        />
                    </div>
                    {/* Execution Result Panel */}
                    {(result || evaluating) && (
                        <div style={{
                            height: 250, background: '#1e1e1e', borderTop: '1px solid #333', color: '#fff',
                            padding: 16, overflowY: 'auto', fontFamily: 'monospace'
                        }}>
                            {evaluating ? (
                                <div style={{ color: '#888' }}>Compiling & Judging against test cases...</div>
                            ) : (
                                <div>
                                    <h3 style={{
                                        fontSize: 16, fontWeight: 600, marginBottom: 12,
                                        color: result.passed ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                        {result.passed ? <CheckCircle size={18} /> : '❌'}
                                        {result.passed ? 'All Test Cases Passed!' : 'Failed'}
                                    </h3>
                                    <div style={{ background: '#000', padding: 12, borderRadius: 6, fontSize: 13, color: '#ddd' }}>
                                        <p style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>{result.feedback}</p>
                                        <div style={{ color: '#a3a3a3', marginTop: 12 }}>
                                            Time Complexity: {result.time_complexity} <br/>
                                            Space Complexity: {result.space_complexity}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', background: '#fafafa' }}>
            {/* Sidebar Navigation */}
            <div style={{ width: 280, background: '#fff', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{course.topic}</h2>
                    <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>{course.difficulty}</span>
                </div>
                <div style={{ padding: '16px 12px', overflowY: 'auto', flex: 1 }}>
                    {/* Materials */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, padding: '0 8px' }}>Learning Materials</div>
                    {materials.map(mat => (
                        <button key={mat.id} onClick={() => setActiveTab({ type: 'material', id: mat.id })}
                            style={{
                                width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                                background: activeTab.type === 'material' && activeTab.id === mat.id ? 'var(--primary-light)' : 'transparent',
                                color: activeTab.type === 'material' && activeTab.id === mat.id ? 'var(--primary)' : 'var(--text)',
                                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14,
                                transition: 'all 0.15s'
                            }}>
                            <BookOpen size={16} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mat.title}</span>
                        </button>
                    ))}

                    <div style={{ height: 1, background: 'var(--border)', margin: '16px 8px' }} />
                    
                    {/* Quiz */}
                    {mcqs.length > 0 && (
                        <button onClick={() => setActiveTab({ type: 'quiz', id: 'all' })}
                            style={{
                                width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                                background: activeTab.type === 'quiz' ? 'var(--primary-light)' : 'transparent',
                                color: activeTab.type === 'quiz' ? 'var(--primary)' : 'var(--text)',
                                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14
                            }}>
                            <FileQuestion size={16} /> Knowledge Quiz
                        </button>
                    )}

                    <div style={{ height: 1, background: 'var(--border)', margin: '16px 8px' }} />

                    {/* Challenges */}
                    {challenges.length > 0 && (
                        <>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, padding: '0 8px' }}>Coding Challenges</div>
                            {challenges.map(chal => (
                                <button key={chal.id} onClick={() => setActiveTab({ type: 'challenge', id: chal.id })}
                                    style={{
                                        width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                                        background: activeTab.type === 'challenge' && activeTab.id === chal.id ? 'var(--primary-light)' : 'transparent',
                                        color: activeTab.type === 'challenge' && activeTab.id === chal.id ? 'var(--primary)' : 'var(--text)',
                                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14
                                    }}>
                                    <Code size={16} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chal.title}</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeTab.type === 'material' ? (
                    <div style={{ padding: '40px 0' }}>
                        <MaterialView material={materials.find(m => m.id === (activeTab.id || materials[0]?.id)) || materials[0]} />
                    </div>
                ) : activeTab.type === 'quiz' ? (
                    <div style={{ padding: '40px 0' }}>
                        <QuizView />
                    </div>
                ) : activeTab.type === 'challenge' ? (
                    <ChallengeView challenge={challenges.find(c => c.id === activeTab.id) || challenges[0]} />
                ) : null}
            </div>
            
            <style>{`
                .prose h1 { font-size: 2em; margin-bottom: 0.5em; font-weight: 700; color: var(--text); }
                .prose h2 { font-size: 1.5em; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; color: var(--text); }
                .prose h3 { font-size: 1.25em; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; color: var(--text); }
                .prose p { margin-bottom: 1em; line-height: 1.6; color: #4b5563; }
                .prose ul { margin-bottom: 1em; padding-left: 1.5em; list-style-type: disc; color: #4b5563; }
                .prose li { margin-bottom: 0.25em; }
                .prose pre { background: #f1f5f9; padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; }
                .prose code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
                .prose pre code { background: transparent; padding: 0; }
            `}</style>
        </div>
    );
}
