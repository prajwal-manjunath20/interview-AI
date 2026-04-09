import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { interview as interviewApi } from '../services/api';
import ScoreBar from '../components/ScoreBar';

function parseFeedbackSections(feedback) {
    const text = String(feedback || '').trim();
    if (!text) {
        return { strengths: [], improvements: [], summary: '' };
    }

    const strengthsMatch = text.match(/Observed strengths:\s*(.*?)(?=\.\s+Recommended improvement:|$)/i);
    const improvementMatch = text.match(/Recommended improvement:\s*(.*?)(?=\.$|$)/i);

    const strengths = strengthsMatch?.[1]
        ? strengthsMatch[1].split(',').map((item) => item.trim()).filter(Boolean)
        : [];

    const improvements = improvementMatch?.[1]
        ? improvementMatch[1]
            .split(/Also,\s*/i)
            .map((item) => item.trim().replace(/\.$/, ''))
            .filter(Boolean)
        : [];

    const summary = text
        .replace(/Observed strengths:\s*.*?(?=\.\s+Recommended improvement:|$)/i, '')
        .replace(/Recommended improvement:\s*.*?(?=\.$|$)/i, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\./, '')
        .trim();

    return { strengths, improvements, summary };
}

export default function FeedbackPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const s = location.state || {};
    const { evaluation, starAnalysis, confidenceAnalysis, followUp, question, answer,
        sessionId, role, difficulty, questionIndex, totalQuestions, isLast, remainingQuestions } = s;

    const [tab, setTab] = useState('feedback');
    const [nextLoading, setNextLoading] = useState(false);

    const score = evaluation ? Math.round(((evaluation.relevance + evaluation.clarity + evaluation.depth) / 3) * 10) / 10 : 0;
    const scoreColor = score >= 7 ? '#2A9D8F' : score >= 4 ? '#F4A261' : '#E63946';
    const scoreLabel = score >= 7 ? 'Strong answer' : score >= 4 ? 'Good effort' : 'Needs improvement';
    const feedbackSections = parseFeedbackSections(evaluation?.feedback);

    const handleNext = async () => {
        if (isLast) { navigate('/summary', { state: { sessionId, role, difficulty } }); return; }
        setNextLoading(true);
        try {
            const result = await interviewApi.next(sessionId, role, difficulty, question, answer, score);
            const nextQuestion = result.question;
            const newDifficulty = result.newDifficulty || difficulty;

            // Build updated questions list and advance the index
            const updatedQuestions = [...(remainingQuestions || [])];
            if (questionIndex + 1 >= updatedQuestions.length) {
                updatedQuestions.push(nextQuestion);
            } else {
                updatedQuestions[questionIndex + 1] = nextQuestion;
            }

            navigate('/interview', {
                state: {
                    sessionId,
                    role,
                    difficulty: newDifficulty,
                    questions: updatedQuestions,
                    _startAt: questionIndex + 1,
                },
            });
        } catch (err) {
            console.error('Failed to get next question:', err);
            // Fallback: advance with whatever question was already queued
            navigate('/interview', {
                state: {
                    sessionId, role, difficulty,
                    questions: remainingQuestions || [],
                    _startAt: questionIndex + 1,
                },
            });
        } finally {
            setNextLoading(false);
        }
    };


    if (!evaluation) { navigate('/'); return null; }

    return (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 6px', fontWeight: 500 }}>
                Question {questionIndex + 1} of {totalQuestions}
            </p>

            {/* Score hero */}
            <div className="card animate-fade-up" style={{ padding: 32, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 28 }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%', border: `3px solid ${scoreColor}`,
                    background: `${scoreColor}12`, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: scoreColor }}>{score}</span>
                    <span style={{ fontSize: 10, color: scoreColor, fontWeight: 500 }}>/ 10</span>
                </div>
                <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{scoreLabel}</p>
                    <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--muted)' }}>{question.slice(0, 90)}{question.length > 90 ? '…' : ''}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0 24px' }}>
                        <ScoreBar label="Relevance" value={evaluation.relevance} />
                        <ScoreBar label="Clarity" value={evaluation.clarity} />
                        <ScoreBar label="Depth" value={evaluation.depth} />
                        <ScoreBar label="Structure" value={evaluation.structure} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: 4, background: '#F3F4F6', borderRadius: 12, width: 'fit-content' }}>
                {[{ id: 'feedback', label: 'AI Feedback' }, { id: 'star', label: 'STAR Analysis' }, { id: 'comm', label: 'Communication' }].map(t => (
                    <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="card animate-fade-in" style={{ padding: 28, marginBottom: 16 }}>
                {tab === 'feedback' && (
                    <>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: 'var(--text)' }}>Detailed Feedback</h3>
                        {feedbackSections.summary && (
                            <p style={{ margin: '0 0 16px', fontSize: 15, lineHeight: 1.75, color: '#374151' }}>{feedbackSections.summary}</p>
                        )}

                        {feedbackSections.strengths.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '0 0 8px' }}>What Went Well</p>
                                {feedbackSections.strengths.map((item, index) => (
                                    <p key={index} style={{ margin: '0 0 6px', fontSize: 14, color: '#374151', paddingLeft: 12, borderLeft: '2px solid var(--primary)' }}>
                                        {item}
                                    </p>
                                ))}
                            </div>
                        )}

                        {feedbackSections.improvements.length > 0 && (
                            <div style={{ marginBottom: 4 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#B45309', margin: '0 0 8px' }}>What To Improve</p>
                                {feedbackSections.improvements.map((item, index) => (
                                    <p key={index} style={{ margin: '0 0 6px', fontSize: 14, color: '#374151', paddingLeft: 12, borderLeft: '2px solid #F59E0B' }}>
                                        {item}
                                    </p>
                                ))}
                            </div>
                        )}

                        {!feedbackSections.summary && feedbackSections.strengths.length === 0 && feedbackSections.improvements.length === 0 && (
                            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: '#374151' }}>{evaluation.feedback}</p>
                        )}

                        {followUp && (
                            <div style={{ marginTop: 20, padding: 16, background: 'var(--secondary-light)', borderRadius: 10, border: '1px solid #fde8c8' }}>
                                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Follow-up Question</p>
                                <p style={{ margin: 0, fontSize: 14, color: '#78350f', fontWeight: 500 }}>{followUp}</p>
                            </div>
                        )}
                    </>
                )}
                {tab === 'star' && (
                    starAnalysis ? (
                        <>
                            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: 'var(--text)' }}>STAR Framework Analysis</h3>
                            {[['Situation', starAnalysis.situation], ['Task', starAnalysis.task], ['Action', starAnalysis.action], ['Result', starAnalysis.result]].map(([k, v]) => (
                                <ScoreBar key={k} label={k} value={v} max={5} />
                            ))}
                            {starAnalysis.tips && (
                                <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--primary-light)', borderRadius: 10 }}>
                                    <p style={{ margin: 0, fontSize: 14, color: '#065f46', lineHeight: 1.6 }}>💡 {starAnalysis.tips}</p>
                                </div>
                            )}
                        </>
                    ) : <p style={{ color: 'var(--muted)', margin: 0 }}>STAR analysis is for behavioral questions. This was a technical question.</p>
                )}
                {tab === 'comm' && confidenceAnalysis && (
                    <>
                        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text)' }}>Communication Quality</h3>
                        <ScoreBar label="Confidence Score" value={confidenceAnalysis.confidence_score} />
                        {confidenceAnalysis.issues?.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>Issues detected</p>
                                {confidenceAnalysis.issues.map((issue, i) => (
                                    <p key={i} style={{ margin: '0 0 6px', fontSize: 13, color: '#374151', paddingLeft: 12, borderLeft: '2px solid var(--danger)' }}>
                                        {issue}
                                    </p>
                                ))}
                            </div>
                        )}
                        {confidenceAnalysis.suggestions?.length > 0 && (
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>Suggestions</p>
                                {confidenceAnalysis.suggestions.map((s, i) => (
                                    <p key={i} style={{ margin: '0 0 6px', fontSize: 13, color: '#374151', paddingLeft: 12, borderLeft: '2px solid var(--primary)' }}>
                                        {s}
                                    </p>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Your answer recap */}
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F9FAFB', border: '1px solid var(--border)', marginBottom: 24 }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Answer</p>
                <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{answer}</p>
            </div>

            <button className="btn-primary" onClick={handleNext} disabled={nextLoading} style={{ width: '100%', padding: '14px', fontSize: 15 }}>
                {nextLoading ? 'Loading next question…' : isLast ? 'View Session Summary' : `Next Question →`}
            </button>
        </div>
    );
}
