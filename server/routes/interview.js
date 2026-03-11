const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const {
    startSession, evaluateAnswer, generateFollowUp, nextQuestion, finishSession,
} = require('../controllers/interviewController');

router.use(verifyToken);

router.post('/start', startSession);
router.post('/evaluate', evaluateAnswer);
router.post('/followup', generateFollowUp);
router.post('/next', nextQuestion);
router.post('/finish', finishSession);

module.exports = router;
