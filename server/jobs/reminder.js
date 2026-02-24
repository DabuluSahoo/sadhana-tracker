const cron = require('node-cron');
const db = require('../config/db');
const { sendOTP } = require('../config/mailer');

// Send a reminder email (reusing mailer's HTTP helper)
const sendReminderEmail = async (email, username, date) => {
    const https = require('https');
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
                <p style="color: #888; font-size: 12px; text-align: center;">
                    Hare Krishna! Keep up your spiritual practice every day. 🌸
                </p>
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

// Send a data-expiry summary to an admin/owner listing affected devotees
const sendDataExpiryWarningToAdmin = async (adminEmail, adminUsername, expiringUsers) => {
    const https = require('https');
    const rows = expiringUsers.map(u =>
        `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0e0b0;">${u.username}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0e0b0;color:#888;">${u.email || '—'}</td>
        </tr>`
    ).join('');

    const body = JSON.stringify({
        from: 'Sadhana Tracker <noreply@wsahoo.space>',
        to: [adminEmail],
        subject: `⚠️ ${expiringUsers.length} Devotee(s) Have Data Expiring in 7 Days`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 2px solid #f0a500; border-radius: 8px; background: #fffdf5;">
                <h2 style="color: #c47a00; text-align: center;">🪷 Sadhana Tracker — Admin Alert</h2>
                <p style="font-size: 16px;">Hare Krishna, <strong>${adminUsername}</strong>! 🙏</p>
                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 16px; margin: 16px 0;">
                    <p style="font-size: 15px; color: #856404; margin: 0;">
                        ⚠️ The following devotees have sadhana records that are <strong>53–59 days old</strong> and will be <strong>automatically deleted in 7 days</strong>.
                    </p>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="background:#f0a500;color:white;">
                            <th style="padding:8px 12px;text-align:left;">Username</th>
                            <th style="padding:8px 12px;text-align:left;">Email</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="https://sadhana.wsahoo.space/admin"
                       style="background: #c47a00; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold;">
                        📄 Go to Admin Dashboard
                    </a>
                </div>
                <p style="color: #888; font-size: 12px; text-align: center;">
                    Hare Krishna! 🌸 You can download individual reports from the Admin Dashboard.
                </p>
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

// Run every day at 7:59 AM IST (2:29 UTC)
cron.schedule('29 2 * * *', async () => {
    console.log('--- STARTING DAILY REMINDER JOB ---');
    let logId = null;

    try {
        // Log start
        const [logRes] = await db.query(
            'INSERT INTO cron_logs (job_name, start_time, status) VALUES (?, NOW(), ?)',
            ['DAILY_REMINDER', 'RUNNING']
        );
        logId = logRes.insertId;

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
                process.stdout.write(`Sending to ${user.username}... `);
                await sendReminderEmail(user.email.trim(), user.username, yesterdayStr);
                results.push({ user: user.username, status: 'SUCCESS' });
                console.log('✅');
                await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (err) {
                results.push({ user: user.username, status: 'FAILED', error: err.message });
                console.log(`❌ ${err.message}`);
            }
        }

        // Update log on success
        await db.query(
            'UPDATE cron_logs SET end_time = NOW(), status = ?, results = ? WHERE id = ?',
            ['COMPLETED', JSON.stringify({ dateChecked: yesterdayStr, sentCount: results.length, details: results }), logId]
        );
        console.log('--- DAILY REMINDER JOB COMPLETED ---');
    } catch (error) {
        console.error('CRITICAL ERROR in reminder task:', error);
        if (logId) {
            await db.query(
                'UPDATE cron_logs SET end_time = NOW(), status = ?, error_message = ? WHERE id = ?',
                ['FAILED', error.message, logId]
            );
        }
    }
});

// ─── Daily Cleanup Job (3:30 AM IST = 22:00 UTC) ───────────────────────────
// Keeps TiDB Cloud free tier storage lean by purging old/expired rows.
cron.schedule('0 22 * * *', async () => {
    console.log('--- DAILY CLEANUP JOB STARTED ---');
    try {
        const [r1] = await db.query('DELETE FROM otp_tokens WHERE expires_at < NOW()');
        console.log(`🗑️  OTP tokens deleted: ${r1.affectedRows}`);

        const [r2] = await db.query('DELETE FROM cron_logs WHERE start_time < NOW() - INTERVAL 30 DAY');
        console.log(`🗑️  Old cron logs deleted: ${r2.affectedRows}`);

        const [r3] = await db.query('DELETE FROM daily_sadhana WHERE created_at < NOW() - INTERVAL 60 DAY');
        console.log(`🗑️  Old sadhana entries deleted: ${r3.affectedRows}`);

        console.log('--- DAILY CLEANUP JOB COMPLETED ---');
    } catch (err) {
        console.error('CLEANUP JOB ERROR:', err.message);
    }
});

// ─── Data Expiry Warning Job (8:30 AM IST = 3:00 UTC) ──────────────────────
// Finds devotees with data expiring in 7 days and notifies admins/owners.
cron.schedule('0 3 * * *', async () => {
    console.log('--- DATA EXPIRY WARNING JOB STARTED ---');
    try {
        // 1. Find devotees with entries that are 53–59 days old
        const [expiringUsers] = await db.query(`
            SELECT DISTINCT u.id, u.username, u.email
            FROM users u
            INNER JOIN daily_sadhana ds ON ds.user_id = u.id
            WHERE ds.created_at BETWEEN NOW() - INTERVAL 59 DAY AND NOW() - INTERVAL 53 DAY
        `);

        if (expiringUsers.length === 0) {
            console.log('✅ No expiring data today. No alert needed.');
            return;
        }

        // 2. Fetch all admin and owner users who have an email
        const [admins] = await db.query(`
            SELECT id, username, email FROM users
            WHERE role IN ('admin', 'owner') AND email IS NOT NULL
        `);

        if (admins.length === 0) {
            console.log('⚠️  Expiring data found but no admin/owner emails configured.');
            return;
        }

        // 3. Send one summary email to each admin/owner
        console.log(`📧 Notifying ${admins.length} admin(s)/owner(s) about ${expiringUsers.length} expiring devotee(s)...`);
        for (const admin of admins) {
            try {
                await sendDataExpiryWarningToAdmin(admin.email, admin.username, expiringUsers);
                console.log(`  ✅ Alert sent to ${admin.username} (${admin.email})`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // rate-limit
            } catch (err) {
                console.error(`  ❌ Failed for ${admin.username}: ${err.message}`);
            }
        }

        console.log('--- DATA EXPIRY WARNING JOB COMPLETED ---');
    } catch (err) {
        console.error('EXPIRY WARNING JOB ERROR:', err.message);
    }
});
