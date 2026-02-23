const express = require('express');
const router = express.Router();
const { getAllUsers, getUserLogs, editUserLog, promoteUser, demoteUser } = require('../controllers/adminController');
const { protect, adminObj, ownerOnly } = require('../middleware');

router.get('/users', protect, adminObj, getAllUsers);
router.get('/users/:userId/logs', protect, adminObj, getUserLogs);
router.put('/logs/:logId', protect, adminObj, editUserLog);
router.put('/users/:userId/promote', protect, ownerOnly, promoteUser);
router.put('/users/:userId/demote', protect, ownerOnly, demoteUser);

module.exports = router;
