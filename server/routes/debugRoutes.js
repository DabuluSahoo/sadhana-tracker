const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const db = require('../config/db');
const https = require('https');
const { sendPushNotification } = require('../config/pushService');

// Helper to send email (copied from reminder.js for testing)
const sendReminderEmail = async (email, username, date) => {
    return; // HARD KILL SWITCH: reminders are push-only now.
    const body = JSON.stringify({
        from: 'Sadhana Tracker <noreply@wsahoo.space>',
        to: [email],
        subject: '🪷 Daily Sadhana Reminder',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #f0a500; border-radius: 8px;">
                <h2 style="color: #c47a00; text-align: center;">🪷 Sadhana Tracker</h2>
                <p style="font-size: 16px;">Hare Krishna, <strong>${username}</strong>! 🙏</p>
                <p style="font-size: 15px; color: #444;">
                    You haven't filled in your sadhana report for <strong>${date}</strong> yet.<br/>
                    Please take a moment to log yesterday's spiritual activities.
                </p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="https://sadhana.wsahoo.space"
                       style="background: #c47a00; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold;">
                        Fill Yesterday's Sadhana
                    </a>
                </div>
                <p style="color: #888; font-size: 12px; text-align: center;">Hare Krishna! Keep up your spiritual practice every day. 🌸</p>
            </div>
        `,
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

const { runWeeklyReport } = require('../jobs/weeklyReport');

router.post('/trigger-reminder', protect, async (req, res) => {
    // Owner only route
    if (req.user.role !== 'owner') {
        return res.status(403).json({ message: 'Only owner can trigger generic test reminders' });
    }

    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        const [users] = await db.query(`
            SELECT u.id, u.username, u.email, u.device_token
            FROM users u
            WHERE u.email IS NOT NULL 
              AND u.email != ''
              AND u.role != 'owner'
              AND u.group_name != 'brahmacari'
              AND u.id NOT IN (
                  SELECT user_id FROM daily_sadhana WHERE date = ?
              )
        `, [yesterdayStr]);

        const results = [];
        for (const user of users) {
            try {
                // await sendReminderEmail(user.email.trim(), user.username, yesterdayStr);
                
                if (user.device_token) {
                    await sendPushNotification(user.device_token, {
                        title: '🪷 Daily Sadhana Reminder (Test)',
                        body: `Hare Krishna ${user.username}! Please take a moment to log yesterday's spiritual activities.`
                    });
                }
                results.push({ user: user.username, status: 'SUCCESS' });
                // Add delay to prevent rate limit failures
                await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (err) {
                results.push({ user: user.username, status: 'FAILED', error: err.message });
            }
        }
        res.json({ message: 'Reminders triggered', count: results.length, details: results });
    } catch (err) {
        res.status(500).json({ message: 'Failed to trigger reminders', error: err.message });
    }
});

// Force trigger the weekly automated report
router.get('/force-weekly-report/:secret', async (req, res) => {
    const { secret } = req.params;
    const expectedSecret = process.env.REMINDER_SECRET || 'iskcon_secret_108';

    if (secret !== expectedSecret) {
        return res.status(401).json({ message: 'Invalid secret' });
    }

    console.log('--- MANUAL WEEKLY REPORT TRIGGERED ---');
    try {
        const result = await runWeeklyReport();
        res.json({ message: 'Weekly report triggered successfully', result });
    } catch (err) {
        res.status(500).json({ message: 'Failed to trigger weekly report', error: err.message });
    }
});

// External trigger for cron services (e.g., cron-job.org)
// ⚠️  This route is now a KEEP-ALIVE PING ONLY.
// Email reminders are handled exclusively by the internal node-cron at 8 AM IST.
router.get('/external-trigger/:secret', (req, res) => {
    const { secret } = req.params;
    const expectedSecret = process.env.REMINDER_SECRET || 'iskcon_secret_108';

    if (secret !== expectedSecret) {
        return res.status(401).json({ message: 'Invalid secret' });
    }

    console.log('--- KEEP-ALIVE PING RECEIVED ---');
    res.json({ message: 'Server is awake. Emails handled by internal cron.', timestamp: new Date().toISOString() });
});

module.exports = router;
