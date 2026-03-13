const { z } = require('zod');
const { query } = require('../config/db');
const ai = require('../services/aiService');
const { computeScore, getNextDifficulty, isBehavioral } = require('../utils/scoring');

const startSchema = z.object({
    role: z.string().min(1),
    difficulty: z.enum(['Junior', 'Mid', 'Senior']),
});

const evaluateSchema = z.object({
    sessionId: z.string().uuid(),
    question: z.string().min(1),
    answer: z.string().min(1),
    questionIndex: z.number().int().min(0),
    currentDifficulty: z.string(),
});

const followUpSchema = z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
});

const nextSchema = z.object({
    sessionId: z.string().uuid(),
    role: z.string().min(1),
    difficulty: z.string().min(1),
    prevQuestion: z.string().min(1),
    prevAnswer: z.string().min(1),
    score: z.number(),
});

async function startSession(req, res) {
    const { role, difficulty } = startSchema.parse(req.body);
    const userId = req.user.id;

    // Check global database cache first
    let questions = [];
    try {
        const cacheResult = await query(
            'SELECT questions FROM question_bank WHERE role = $1 AND difficulty = $2',
            [role, difficulty]
        );
        if (cacheResult.rows.length > 0) {
            questions = cacheResult.rows[0].questions;
        }
    } catch (err) {
        console.error('Cache read error:', err.message);
    }

    // If cache miss, generate via AI and store
    if (!questions || questions.length === 0) {
        const aiResult = await ai.generateQuestions(role, difficulty);
        questions = aiResult.questions || [];

        if (questions.length > 0) {
            try {
                await query(
                    'INSERT INTO question_bank (role, difficulty, questions) VALUES ($1, $2, $3) ON CONFLICT (role, difficulty) DO NOTHING',
                    [role, difficulty, JSON.stringify(questions)]
                );
            } catch (err) {
                console.error('Cache write error:', err.message);
            }
        }
    }

    // Create session in DB
    const sessionResult = await query(
        'INSERT INTO sessions (user_id, role, difficulty) VALUES ($1, $2, $3) RETURNING id',
        [userId, role, difficulty]
    );
    const sessionId = sessionResult.rows[0].id;

    res.json({ sessionId, questions, role, difficulty });
}

async function evaluateAnswer(req, res) {
    const { sessionId, question, answer, questionIndex, currentDifficulty } = evaluateSchema.parse(req.body);

    // Run all AI analyses in parallel
    const isBeh = isBehavioral(question);
    const [evalResult, starResult, confResult] = await Promise.allSettled([
        ai.evaluateAnswer(question, answer),
        isBeh ? ai.analyzeSTAR(question, answer) : Promise.resolve(null),
        ai.analyzeConfidence(answer),
    ]);

    const evaluation = evalResult.status === 'fulfilled'
        ? evalResult.value
        : { relevance: 5, clarity: 5, depth: 5, structure: 5, confidence: 5, feedback: 'Evaluation unavailable.' };

    const starAnalysis = starResult.status === 'fulfilled' ? starResult.value : null;
    const confidenceAnalysis = confResult.status === 'fulfilled'
        ? confResult.value
        : { confidence_score: 5, issues: [], suggestions: [] };

    const score = computeScore(evaluation);

    // Generate follow-up if answer lacks depth
    let followUp = null;
    if (evaluation.depth < 6) {
        const fuResult = await ai.generateFollowUp(question, answer).catch(() => null);
        followUp = fuResult?.follow_up || null;
    }

    // Save answer to DB
    const answerResult = await query(
        'INSERT INTO answers (session_id, question, answer, question_index) VALUES ($1, $2, $3, $4) RETURNING id',
        [sessionId, question, answer, questionIndex]
    );
    const answerId = answerResult.rows[0].id;

    // Save evaluation to DB
    await query(
        `INSERT INTO evaluations
      (answer_id, relevance, clarity, depth, structure, confidence, feedback,
       star_situation, star_task, star_action, star_result, star_tips,
       confidence_score, confidence_issues, confidence_suggestions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
            answerId,
            evaluation.relevance, evaluation.clarity, evaluation.depth,
            evaluation.structure, evaluation.confidence, evaluation.feedback,
            starAnalysis?.situation ?? null, starAnalysis?.task ?? null,
            starAnalysis?.action ?? null, starAnalysis?.result ?? null,
            starAnalysis?.tips ?? null,
            confidenceAnalysis.confidence_score,
            JSON.stringify(confidenceAnalysis.issues || []),
            JSON.stringify(confidenceAnalysis.suggestions || []),
        ]
    );

    res.json({ evaluation, starAnalysis, confidenceAnalysis, followUp, score });
}

async function generateFollowUp(req, res) {
    const { question, answer } = followUpSchema.parse(req.body);
    const result = await ai.generateFollowUp(question, answer);
    res.json({ follow_up: result.follow_up });
}

async function nextQuestion(req, res) {
    const { sessionId, role, difficulty, prevQuestion, prevAnswer, score } = nextSchema.parse(req.body);
    const nextDiff = getNextDifficulty(score, difficulty);
    
    // Check cached question bank first to avoid AI call
    let questionPool = [];
    try {
        const cacheResult = await query(
            'SELECT questions FROM question_bank WHERE role = $1 AND difficulty = $2',
            [role, nextDiff]
        );
        if (cacheResult.rows.length > 0) {
            questionPool = cacheResult.rows[0].questions;
        }
    } catch (err) {
        console.error('Cache read error in nextQuestion:', err.message);
    }

    let nextQuestionText = null;
    if (questionPool && questionPool.length > 0) {
        // Find a question we haven't asked right before
        const validQuestions = questionPool.filter(q => q.toLowerCase().trim() !== prevQuestion.toLowerCase().trim());
        if (validQuestions.length > 0) {
            nextQuestionText = validQuestions[Math.floor(Math.random() * validQuestions.length)];
        }
    }

    // Fallback to AI if cache misses or no unique questions remain
    if (!nextQuestionText) {
        const result = await ai.generateNextQuestion(role, nextDiff, prevQuestion, prevAnswer, score);
        nextQuestionText = result.question;
    }

    res.json({ question: nextQuestionText, newDifficulty: nextDiff });
}

async function finishSession(req, res) {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(req.body);

    // Calculate overall score from all evaluations in this session
    const result = await query(
        `SELECT AVG((e.relevance + e.clarity + e.depth) / 3.0) as avg_score
     FROM evaluations e
     JOIN answers a ON a.id = e.answer_id
     WHERE a.session_id = $1`,
        [sessionId]
    );
    const overallScore = parseFloat(result.rows[0]?.avg_score || 0);

    await query('UPDATE sessions SET overall_score = $1 WHERE id = $2', [overallScore, sessionId]);
    res.json({ overallScore: Math.round(overallScore * 10) / 10 });
}

module.exports = { startSession, evaluateAnswer, generateFollowUp, nextQuestion, finishSession };
