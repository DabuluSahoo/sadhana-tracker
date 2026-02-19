const express = require('express');
const router = express.Router();
const japaController = require('../controllers/japaController');
const { protect: authenticateToken } = require('../middleware');

// Debugging check to ensure imports are correct
if (!japaController.getTodayProgress || !japaController.syncProgress || !japaController.getHistory) {
    console.error("❌ Error: japaController functions are undefined. Check controller exports.");
}

router.get('/today', authenticateToken, japaController.getTodayProgress);
router.post('/sync', authenticateToken, japaController.syncProgress);
router.get('/history', authenticateToken, japaController.getHistory);

module.exports = router;
