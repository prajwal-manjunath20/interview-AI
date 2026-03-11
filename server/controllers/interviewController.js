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

    // Generate questions via AI
    const aiResult = await ai.generateQuestions(role, difficulty);
    const questions = aiResult.questions || [];

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
    const result = await ai.generateNextQuestion(role, nextDiff, prevQuestion, prevAnswer, score);
    res.json({ question: result.question, newDifficulty: nextDiff });
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
