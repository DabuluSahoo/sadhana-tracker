const express = require('express');
const router = express.Router();
const { getAllUsers, getUserLogs, editUserLog } = require('../controllers/adminController');
const { protect, adminObj } = require('../middleware');

router.get('/users', protect, adminObj, getAllUsers);
router.get('/users/:userId/logs', protect, adminObj, getUserLogs);
router.put('/logs/:logId', protect, adminObj, editUserLog);

module.exports = router;
