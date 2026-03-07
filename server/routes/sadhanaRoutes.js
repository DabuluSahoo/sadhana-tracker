const express = require('express');
const router = express.Router();
const { createOrUpdateLog, getWeeklyLogs, getHistory, getGroupLogs } = require('../controllers/sadhanaController');
const { protect, adminObj } = require('../middleware');

router.post('/', protect, createOrUpdateLog);
router.get('/weekly', protect, getWeeklyLogs);
router.get('/history', protect, getHistory);
router.get('/group-logs', protect, adminObj, getGroupLogs);

module.exports = router;
