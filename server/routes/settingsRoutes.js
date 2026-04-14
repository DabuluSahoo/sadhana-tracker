const express = require('express');
const router = express.Router();
const { 
    getBroadcast, 
    updateBroadcast, 
    getAllQuotas, 
    getQuotaByGroup, 
    updateQuota,
    getSettings,
    uploadRelease
} = require('../controllers/settingsController');
const { protect, ownerOnly } = require('../middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// --- Global Settings ---
router.get('/', protect, getSettings);

// --- Global Broadcast ---
router.get('/broadcast', getBroadcast); 
router.put('/broadcast', protect, ownerOnly, updateBroadcast);

// --- Group Quotas ---
router.get('/quotas', protect, getAllQuotas); 
router.get('/quotas/:groupName', protect, getQuotaByGroup); 
router.put('/quotas/:groupName', protect, ownerOnly, updateQuota);

// --- Release Management ---
router.post('/upload-release', protect, ownerOnly, upload.single('apkFile'), uploadRelease);

module.exports = router;
