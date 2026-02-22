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
router.get('/external-trigger/:secret', async (req, res) => {
    const { secret } = req.params;
    const expectedSecret = process.env.REMINDER_SECRET || 'iskcon_secret_108';

    if (secret !== expectedSecret) {
        return res.status(401).json({ message: 'Invalid secret' });
    }

    console.log('--- EXTERNAL REMINDER TRIGGERED ---');
    let logId = null;
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        // Log start
        const [logRes] = await db.query(
            'INSERT INTO cron_logs (job_name, start_time, status) VALUES (?, NOW(), ?)',
            ['EXTERNAL_TRIGGER', 'RUNNING']
        );
        logId = logRes.insertId;

        // Check ALL users with emails
        const [allUsers] = await db.query(`SELECT id, username, email FROM users WHERE email IS NOT NULL AND email != ''`);
        const [submitted] = await db.query(`SELECT user_id FROM daily_sadhana WHERE date = ?`, [yesterdayStr]);
        const submittedIds = submitted.map(s => s.user_id);

        const usersToRemind = allUsers.filter(u => !submittedIds.includes(u.id));

        const results = [];
        for (const user of usersToRemind) {
            try {
                await sendReminderEmail(user.email, user.username, yesterdayStr);
                results.push({ user: user.username, status: 'SUCCESS' });
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

        res.json({ message: 'Reminder process completed', sentCount: results.length });
    } catch (error) {
        if (logId) {
            await db.query('UPDATE cron_logs SET end_time = NOW(), status = ?, error_message = ? WHERE id = ?', ['FAILED', error.message, logId]);
        }
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
