const express = require('express');
const router = express.Router();
const { getBroadcast, updateBroadcast, getAllQuotas, getQuotaByGroup, updateQuota } = require('../controllers/settingsController');
const { protect, ownerOnly } = require('../middleware');

// --- Global Broadcast ---
router.get('/broadcast', getBroadcast); // Publicly available to authenticated users
router.put('/broadcast', protect, ownerOnly, updateBroadcast);

// --- Group Quotas ---
router.get('/quotas', protect, getAllQuotas); // For admin lists
router.get('/quotas/:groupName', protect, getQuotaByGroup); // For devotee dashboard
router.put('/quotas/:groupName', protect, ownerOnly, updateQuota);

module.exports = router;
