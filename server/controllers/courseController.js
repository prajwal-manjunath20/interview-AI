const { query } = require('../config/db');
const aiService = require('../services/aiService');

const createCourse = async (req, res) => {
    const { topic, difficulty } = req.body;
    const userId = req.user.id; // requires requireAuth middleware

    if (!topic || !difficulty) {
        return res.status(400).json({ error: 'Topic and difficulty are required' });
    }

    try {
        // 1. Generate Course Content via AI
        const courseData = await aiService.generateCourse(topic, difficulty);
        
        // Handle validation errors (e.g., gibberish or invalid topics)
        if (courseData.error) {
            return res.status(400).json({ error: courseData.error });
        }
        if (courseData._fallback && courseData.title === `${topic} Course`) {
             // Let the frontend handle the fallback if the AI was simply unavailable,
             // but if we want to strictly reject unknown things we'd do it here.
             // Given the prompt, the AI will return `{ error: "..." }` for bad topics.
        }
        
        // 2. Save Course to DB
        const courseRes = await query(
            'INSERT INTO courses (user_id, topic, difficulty) VALUES ($1, $2, $3) RETURNING *',
            [userId, topic, difficulty]
        );
        const courseId = courseRes.rows[0].id;

        // 3. Save Materials to DB
        const materials = [];
        let index = 0;
        let materialsSummary = '';
        for (const mat of courseData.materials) {
            const matRes = await query(
                'INSERT INTO course_materials (course_id, title, content_markdown, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
                [courseId, mat.title, mat.content_markdown, index]
            );
            materials.push(matRes.rows[0]);
            materialsSummary += `${mat.title}, `;
            index++;
        }

        // 4. Generate & Save MCQs
        const mcqData = await aiService.generateMCQs(topic, materialsSummary);
        for (const mcq of mcqData.mcqs) {
            await query(
                'INSERT INTO mcqs (course_id, question, options, correct_answer, explanation) VALUES ($1, $2, $3, $4, $5)',
                [courseId, mcq.question, JSON.stringify(mcq.options), mcq.correct_answer, mcq.explanation]
            );
        }

        // 5. Generate & Save a Coding Challenge
        const challengeData = await aiService.generateCodingChallenge(topic, 'javascript'); // default to JS for now
        await query(
            'INSERT INTO coding_challenges (course_id, title, problem_statement, language, starter_code, test_cases) VALUES ($1, $2, $3, $4, $5, $6)',
            [courseId, challengeData.title, challengeData.problem_statement, challengeData.language, challengeData.starter_code, JSON.stringify(challengeData.test_cases)]
        );

        // 6. Init User Progress
        await query(
            'INSERT INTO user_progress (user_id, course_id) VALUES ($1, $2)',
            [userId, courseId]
        );

        res.status(201).json({ message: 'Course generated successfully', courseId });
    } catch (err) {
        console.error('Course generation error:', err);
        res.status(500).json({ error: 'Failed to generate course' });
    }
};

const getCourses = async (req, res) => {
    const userId = req.user.id;
    const coursesRes = await query('SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(coursesRes.rows);
};

const getCourseDetails = async (req, res) => {
    const courseId = req.params.id;
    const userId = req.user.id;

    // Verify ownership
    const courseRes = await query('SELECT * FROM courses WHERE id = $1 AND user_id = $2', [courseId, userId]);
    if (courseRes.rows.length === 0) return res.status(404).json({ error: 'Course not found' });

    const course = courseRes.rows[0];
    const materialsRes = await query('SELECT * FROM course_materials WHERE course_id = $1 ORDER BY order_index ASC', [courseId]);
    const mcqsRes = await query('SELECT * FROM mcqs WHERE course_id = $1', [courseId]);
    const challengesRes = await query('SELECT * FROM coding_challenges WHERE course_id = $1', [courseId]);
    const progressRes = await query('SELECT * FROM user_progress WHERE course_id = $1 AND user_id = $2', [courseId, userId]);

    res.json({
        course,
        materials: materialsRes.rows,
        mcqs: mcqsRes.rows,
        challenges: challengesRes.rows,
        progress: progressRes.rows[0]
    });
};

const evaluateCode = async (req, res) => {
    const { challengeId, code } = req.body;
    
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const challengeRes = await query('SELECT * FROM coding_challenges WHERE id = $1', [challengeId]);
    if (challengeRes.rows.length === 0) return res.status(404).json({ error: 'Challenge not found' });
    const challenge = challengeRes.rows[0];

    const evaluation = await aiService.evaluateCodeSnippet(challenge.problem_statement, challenge.language, code);
    res.json(evaluation);
};

const updateProgress = async (req, res) => {
    const courseId = req.params.id;
    const userId = req.user.id;
    const { completed_materials, quiz_score, completed_challenges } = req.body;

    const progressRes = await query(
        `UPDATE user_progress 
         SET completed_materials = COALESCE($1, completed_materials), 
             quiz_score = COALESCE($2, quiz_score), 
             completed_challenges = COALESCE($3, completed_challenges)
         WHERE user_id = $4 AND course_id = $5 RETURNING *`,
        [
            completed_materials ? JSON.stringify(completed_materials) : null,
            quiz_score,
            completed_challenges ? JSON.stringify(completed_challenges) : null,
            userId,
            courseId
        ]
    );

    res.json(progressRes.rows[0]);
};

module.exports = {
    createCourse,
    getCourses,
    getCourseDetails,
    evaluateCode,
    updateProgress
};
