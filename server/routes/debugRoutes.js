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

router.post('/trigger-reminder', protect, async (req, res) => {
    // Only allow admins to trigger (or just check role)
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('--- MANUAL REMINDER TRIGGERED ---');
    let logId = null;
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        // Log start
        const [logRes] = await db.query(
            'INSERT INTO cron_logs (job_name, start_time, status) VALUES (?, NOW(), ?)',
            ['MANUAL_TRIGGER', 'RUNNING']
        );
        logId = logRes.insertId;

        // First, check ALL users with emails
        const [allUsers] = await db.query(`SELECT id, username, email FROM users WHERE email IS NOT NULL AND email != ''`);

        // ... rest of the existing check ...
        const [submitted] = await db.query(`SELECT user_id FROM daily_sadhana WHERE date = ?`, [yesterdayStr]);
        const submittedIds = submitted.map(s => s.user_id);

        const usersToRemind = allUsers.filter(u => !submittedIds.includes(u.id));
        const skippedUsers = allUsers.filter(u => submittedIds.includes(u.id)).map(u => u.username);

        const results = [];
        for (const user of usersToRemind) {
            try {
                await sendReminderEmail(user.email, user.username, yesterdayStr);
                results.push({ user: user.username, status: 'SUCCESS' });

                // Add 1.5-second delay to stay within Resend Free tier limit (2 req/sec)
                await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (err) {
                results.push({ user: user.username, status: 'FAILED', error: err.message });
            }
        }

        // Update log on success
        await db.query(
            'UPDATE cron_logs SET end_time = NOW(), status = ?, results = ? WHERE id = ?',
            ['COMPLETED', JSON.stringify({ dateChecked: yesterdayStr, sentCount: results.length, details: results }), logId]
        );

        res.json({
            dateChecked: yesterdayStr,
            totalUsersWithEmail: allUsers.length,
            sentCount: results.length,
            skippedBecauseAlreadySubmitted: skippedUsers,
            details: results
        });
    } catch (error) {
        if (logId) {
            await db.query(
                'UPDATE cron_logs SET end_time = NOW(), status = ?, error_message = ? WHERE id = ?',
                ['FAILED', error.message, logId]
            );
        }
        res.status(500).json({ message: error.message });
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
