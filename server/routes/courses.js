const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

router.post('/generate', courseController.createCourse);
router.get('/', courseController.getCourses);
router.get('/:id', courseController.getCourseDetails);
router.post('/evaluate-code', courseController.evaluateCode);
router.put('/:id/progress', courseController.updateProgress);

module.exports = router;
