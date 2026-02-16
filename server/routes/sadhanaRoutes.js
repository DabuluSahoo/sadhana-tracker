const express = require('express');
const router = express.Router();
const { createOrUpdateLog, getWeeklyLogs, getHistory } = require('../controllers/sadhanaController');
const { protect } = require('../middleware');

router.post('/', protect, createOrUpdateLog);
router.get('/weekly', protect, getWeeklyLogs);
router.get('/history', protect, getHistory);

module.exports = router;
