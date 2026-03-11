const { query } = require('../config/db');

async function getSessions(req, res) {
    const userId = req.user.id;

    const result = await query(
        `SELECT
       s.id, s.role, s.difficulty, s.overall_score, s.created_at,
       COUNT(a.id) as question_count
     FROM sessions s
     LEFT JOIN answers a ON a.session_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
        [userId]
    );

    // For each session, get per-question detail
    const sessions = await Promise.all(result.rows.map(async (session) => {
        const answers = await query(
            `SELECT a.question, a.answer, a.question_index,
              e.relevance, e.clarity, e.depth, e.structure, e.confidence, e.feedback,
              e.star_situation, e.star_task, e.star_action, e.star_result,
              e.confidence_score, e.confidence_issues, e.confidence_suggestions
       FROM answers a
       LEFT JOIN evaluations e ON e.answer_id = a.id
       WHERE a.session_id = $1
       ORDER BY a.question_index ASC`,
            [session.id]
        );
        return { ...session, answers: answers.rows };
    }));

    res.json({ sessions });
}

async function getPerformance(req, res) {
    const userId = req.user.id;

    // Overall averages per category
    const avgResult = await query(
        `SELECT
       ROUND(AVG(e.relevance)::numeric, 2) as avg_relevance,
       ROUND(AVG(e.clarity)::numeric, 2) as avg_clarity,
       ROUND(AVG(e.depth)::numeric, 2) as avg_depth,
       ROUND(AVG(e.structure)::numeric, 2) as avg_structure,
       ROUND(AVG(e.confidence)::numeric, 2) as avg_confidence,
       ROUND(AVG(e.confidence_score)::numeric, 2) as avg_comm_confidence
     FROM evaluations e
     JOIN answers a ON a.id = e.answer_id
     JOIN sessions s ON s.id = a.session_id
     WHERE s.user_id = $1`,
        [userId]
    );

    // Score trend over sessions
    const trendResult = await query(
        `SELECT s.id, s.role, s.difficulty, s.overall_score, s.created_at
     FROM sessions s
     WHERE s.user_id = $1
     ORDER BY s.created_at ASC`,
        [userId]
    );

    // Per-session category averages for bar chart
    const sessionBreakdown = await query(
        `SELECT
       s.id as session_id,
       s.role,
       s.created_at,
       ROUND(AVG(e.relevance)::numeric, 1) as relevance,
       ROUND(AVG(e.clarity)::numeric, 1) as clarity,
       ROUND(AVG(e.depth)::numeric, 1) as depth,
       ROUND(AVG(e.structure)::numeric, 1) as structure,
       ROUND(AVG(e.confidence)::numeric, 1) as confidence
     FROM sessions s
     JOIN answers a ON a.session_id = s.id
     JOIN evaluations e ON e.answer_id = a.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.created_at ASC`,
        [userId]
    );

    res.json({
        averages: avgResult.rows[0] || {},
        trend: trendResult.rows,
        sessionBreakdown: sessionBreakdown.rows,
    });
}

module.exports = { getSessions, getPerformance };
