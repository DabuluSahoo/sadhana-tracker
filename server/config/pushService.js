const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to your Firebase service account key
// The USER must provide this file in the config folder
const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');

let messaging = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: 'sadhana-tracker-bde1d.firebasestorage.app'
        });
        messaging = admin.messaging();
        console.log('✅ Firebase Admin initialized successfully from ENV');
    } catch (err) {
        console.error('❌ Failed to initialize Firebase Admin from ENV:', err.message);
    }
} else if (fs.existsSync(serviceAccountPath)) {
    try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: 'sadhana-tracker-bde1d.firebasestorage.app'
        });
        messaging = admin.messaging();
        console.log('✅ Firebase Admin initialized successfully from local file');
    } catch (err) {
        console.error('❌ Failed to initialize Firebase Admin from local file:', err.message);
    }
} else {
    console.log('ℹ️ Firebase service account missing. Push notifications disabled until FIREBASE_SERVICE_ACCOUNT env is set.');
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
        data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        android: {
            priority: 'high',
        },
        apns: {
            payload: {
                aps: {
                    contentAvailable: true,
                },
            },
        },
    };

    // Only add notification object if title is provided
    // This allows sending "data-only" messages which don't show a system popup
    if (title) {
        message.notification = { title, body };
    }

    try {
        const response = await messaging.send(message);
        console.log('Successfully sent push notification:', response);
        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

module.exports = { admin, sendPushNotification };
