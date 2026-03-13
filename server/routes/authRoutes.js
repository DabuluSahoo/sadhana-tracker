const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    sendOtp, 
    verifyOtp, 
    forgotPassword, 
    resetPassword, 
    setGroup,
    approveUser,
    unregisterDevice
} = require('../controllers/authController');
const { protect } = require('../middleware');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', register);
router.post('/login', login);
router.get('/approve', approveUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/set-group', protect, setGroup);
router.post('/register-device', protect, require('../controllers/authController').registerDevice);
router.post('/unregister-device', protect, unregisterDevice);

module.exports = router;
