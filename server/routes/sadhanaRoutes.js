const express = require('express');
const router = express.Router();
const { createOrUpdateLog, getWeeklyLogs, getHistory, getGroupLogs, getDashboardStats, getTrends } = require('../controllers/sadhanaController');
const { protect, adminObj } = require('../middleware');

router.post('/', protect, createOrUpdateLog);
router.get('/stats', protect, getDashboardStats);
router.get('/weekly', protect, getWeeklyLogs);
router.get('/history', protect, getHistory);
router.get('/trends', protect, getTrends);
router.get('/group-logs', protect, adminObj, getGroupLogs);

module.exports = router;
