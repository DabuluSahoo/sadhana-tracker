const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to your Firebase service account key
// The USER must provide this file in the config folder
const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');

let messaging = null;

if (fs.existsSync(serviceAccountPath)) {
    try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        messaging = admin.messaging();
        console.log('✅ Firebase Admin initialized successfully');
    } catch (err) {
        console.error('❌ Failed to initialize Firebase Admin:', err.message);
    }
} else {
    console.log('ℹ️ Firebase service account file missing. Push notifications will be disabled until setup.');
}

/**
 * Send a push notification to a specific device
 * @param {string} deviceToken - The recipient's FCM token
 * @param {object} notification - { title: string, body: string, data?: object }
 */
const sendPushNotification = async (deviceToken, { title, body, data = {} }) => {
    if (!messaging || !deviceToken) return;

    const message = {
        token: deviceToken,
        notification: { title, body },
        data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' } // Standard for various mobile frameworks
    };

    try {
        const response = await messaging.send(message);
        console.log('Successfully sent push notification:', response);
        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        // If the token is invalid/expired, we could potentially clear it from the DB here
    }
};

module.exports = { sendPushNotification };
