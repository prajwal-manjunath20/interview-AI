import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { interview as interviewApi } from '../services/api';
import TimerRing from '../components/TimerRing';

const TOTAL_QUESTIONS = 5;
const TIMER = 120;
const EMPTY_QUESTIONS = [];

function isSpeechSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export default function InterviewPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state;

    const sessionId = state?.sessionId;
    const questions = state?.questions ?? EMPTY_QUESTIONS;
    const role = state?.role || '';
    const currentIdx = state?._startAt ?? 0;
    const difficulty = state?.difficulty || 'Mid';

    const [answer, setAnswer] = useState('');
    const [timeLeft, setTimeLeft] = useState(TIMER);
    const [voiceOn, setVoiceOn] = useState(false);
    const [listening, setListening] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const recogRef = useRef(null);
    const timerRef = useRef(null);
    const answerRef = useRef('');

    const question = questions[currentIdx] || '';
    const showAutoWarn = timeLeft <= 20;

    answerRef.current = answer;

    const handleSubmit = useCallback(async (finalAnswer = answerRef.current.trim() || '(No answer provided)') => {
        clearInterval(timerRef.current);
        window.speechSynthesis?.cancel();
        recogRef.current?.stop();
        setSubmitting(true);
        setError('');

        try {
            const result = await interviewApi.evaluate(sessionId, question, finalAnswer, currentIdx, difficulty);
            const isLast = currentIdx >= TOTAL_QUESTIONS - 1;

            if (isLast) {
                await interviewApi.finish(sessionId);
            }

            navigate('/feedback', {
                state: {
                    ...result,
                    question,
                    answer: finalAnswer,
                    sessionId,
                    role,
                    difficulty,
                    questionIndex: currentIdx,
                    totalQuestions: TOTAL_QUESTIONS,
                    isLast,
                    remainingQuestions: questions,
                    currentDifficulty: difficulty,
                },
            });
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    }, [currentIdx, difficulty, navigate, question, questions, role, sessionId]);

    useEffect(() => {
        if (!question || !voiceOn || !window.speechSynthesis) {
            window.speechSynthesis?.cancel();
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(question);
        utterance.rate = 0.92;

        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find((voice) => voice.lang.startsWith('en')) || voices[0];
        if (preferred) utterance.voice = preferred;

        const speakTimer = setTimeout(() => window.speechSynthesis.speak(utterance), 300);

        return () => {
            clearTimeout(speakTimer);
            window.speechSynthesis.cancel();
        };
    }, [question, voiceOn]);

    useEffect(() => {
        if (!question) return;

        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((t) => Math.max(t - 1, 0));
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [question]);

    useEffect(() => {
        if (timeLeft !== 0 || !question) return;

        clearInterval(timerRef.current);
        void handleSubmit();
    }, [handleSubmit, question, timeLeft]);

    if (!sessionId || !questions.length) {
        navigate('/');
        return null;
    }

    const handleMic = () => {
        if (listening) {
            recogRef.current?.stop();
            setListening(false);
            return;
        }

        const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionApi) return;

        const recognition = new SpeechRecognitionApi();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let final = '';
        recognition.onresult = (event) => {
            let interim = '';

            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                if (event.results[i].isFinal) {
                    final += `${event.results[i][0].transcript} `;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            setAnswer(final + interim);
        };
        recognition.onend = () => setListening(false);
        recognition.onerror = () => setListening(false);

        recogRef.current = recognition;
        recognition.start();
        setListening(true);
    };

    return (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
                <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                    {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
                                background:
                                    i < currentIdx
                                        ? 'var(--primary)'
                                        : i === currentIdx
                                            ? 'var(--secondary)'
                                            : 'var(--border)',
                                transition: 'background 0.3s',
                            }}
                        />
                    ))}
                </div>
                <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {currentIdx + 1} / {TOTAL_QUESTIONS}
                </span>
                <span className="pill pill-teal">{difficulty}</span>
            </div>

            <div className="card animate-fade-up" style={{ padding: 36, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                        <p
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--primary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                margin: '0 0 14px',
                            }}
                        >
                            Question {currentIdx + 1}
                        </p>
                        <p style={{ fontSize: 20, lineHeight: 1.6, color: 'var(--text)', margin: 0, fontWeight: 500 }}>
                            {question}
                        </p>
                    </div>
                    <TimerRing seconds={timeLeft} total={TIMER} />
                </div>
            </div>

            {showAutoWarn && (
                <div
                    style={{
                        padding: '10px 16px',
                        background: '#fef3e8',
                        borderRadius: 10,
                        marginBottom: 16,
                        border: '1px solid #fde8c8',
                    }}
                >
                    <p style={{ margin: 0, fontSize: 13, color: '#92400e', fontWeight: 500 }}>
                        Time running low - {timeLeft}s remaining
                    </p>
                </div>
            )}

            <div className="card animate-fade-up delay-1" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>Your answer</p>
                    {listening && <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>Recording</span>}
                </div>
                <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={7}
                    placeholder="Type your answer here. For behavioral questions, try the STAR method - Situation, Task, Action, Result."
                    style={{
                        width: '100%',
                        resize: 'vertical',
                        minHeight: 160,
                        background: '#fafafa',
                        border: '1.5px solid var(--border)',
                        borderRadius: 10,
                        padding: '14px 16px',
                        fontFamily: 'DM Sans',
                        fontSize: 15,
                        color: 'var(--text)',
                        lineHeight: 1.7,
                        outline: 'none',
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(42,157,143,0.12)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border)';
                        e.target.style.boxShadow = 'none';
                    }}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isSpeechSupported() && (
                    <button
                        onClick={handleMic}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            borderRadius: 10,
                            fontFamily: 'DM Sans',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            border: '1.5px solid',
                            borderColor: listening ? 'var(--danger)' : 'var(--border)',
                            background: listening ? '#fef2f2' : '#fff',
                            color: listening ? 'var(--danger)' : 'var(--muted)',
                            transition: 'all 0.15s',
                        }}
                    >
                        {listening ? 'Stop' : 'Voice'}
                    </button>
                )}
                <button
                    onClick={() => setVoiceOn((v) => !v)}
                    style={{
                        padding: '10px 18px',
                        borderRadius: 10,
                        fontFamily: 'DM Sans',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        border: '1.5px solid var(--border)',
                        background: voiceOn ? 'var(--primary-light)' : '#fff',
                        color: voiceOn ? 'var(--primary)' : 'var(--muted)',
                    }}
                >
                    {voiceOn ? 'Voice On' : 'Voice Off'}
                </button>
                <div style={{ flex: 1 }} />
                {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--danger)' }}>{error}</p>}
                <button
                    className="btn-primary"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || !answer.trim()}
                    style={{ padding: '12px 32px', fontSize: 15 }}
                >
                    {submitting ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="thinking-dot" />
                            <div className="thinking-dot" />
                            <div className="thinking-dot" />
                        </span>
                    ) : 'Submit Answer ->'}
                </button>
            </div>
        </div>
    );
}
