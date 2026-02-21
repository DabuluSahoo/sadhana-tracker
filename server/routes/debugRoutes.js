const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const db = require('../config/db');
const https = require('https');

// Helper to send email (copied from reminder.js for testing)
const sendReminderEmail = async (email, username, date) => {
    const body = JSON.stringify({
        from: 'Sadhana Tracker <noreply@wsahoo.space>',
        to: [email],
        subject: '🪷 Daily Sadhana Reminder (TEST)',
        html: `<p>Hare Krishna ${username}, this is a manual test of the reminder system for ${date}.</p>`,
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.resend.com',
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
                else reject(new Error(`Resend error: ${data}`));
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

router.post('/trigger-reminder', protect, async (req, res) => {
    // Only allow admins to trigger (or just check role)
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('--- MANUAL REMINDER TRIGGERED ---');
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        const [users] = await db.query(`
            SELECT u.id, u.username, u.email
            FROM users u
            WHERE u.email IS NOT NULL 
              AND u.email != ''
              AND u.id NOT IN (
                  SELECT user_id FROM daily_sadhana WHERE date = ?
              )
        `, [yesterdayStr]);

        const results = [];
        for (const user of users) {
            try {
                await sendReminderEmail(user.email, user.username, yesterdayStr);
                results.push({ user: user.username, status: 'SUCCESS' });
                // Delay to stay within Resend Free Tier limit (2 req/sec)
                await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (err) {
                results.push({ user: user.username, status: 'FAILED', error: err.message });
            }
        }

        res.json({
            dateChecked: yesterdayStr,
            totalFound: users.length,
            results: results
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
