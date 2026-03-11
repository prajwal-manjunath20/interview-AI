const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { getSessions, getPerformance } = require('../controllers/analyticsController');

router.use(verifyToken);

router.get('/sessions', getSessions);
router.get('/performance', getPerformance);

module.exports = router;
