const express = require('express');
const router = express.Router();
const multer = require('multer');
const settingsController = require('../controllers/settingsController');
const { protect, ownerOnly } = require('../middleware');

// Configure multer for file upload in memory (we just pass to GitHub)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    }
});

// Public endpoint so the app can check version before login
router.get('/', settingsController.getSettings);

// Protected endpoint for owner to upload a new release to GitHub
router.post('/upload-release', protect, ownerOnly, upload.single('apkFile'), settingsController.configureRelease);

module.exports = router;
