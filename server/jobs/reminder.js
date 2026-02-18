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

// Run every day at 8:00 AM IST (2:30 UTC) — remind to fill YESTERDAY's sadhana
cron.schedule('30 2 * * *', async () => {
    console.log('Running daily sadhana reminder at 8 AM IST');
    try {
        // Yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        // Find users with email who have NOT submitted sadhana for yesterday
        const [users] = await db.query(`
            SELECT u.id, u.username, u.email
            FROM users u
            WHERE u.email IS NOT NULL
              AND u.id NOT IN (
                  SELECT user_id FROM daily_sadhana WHERE date = ?
              )
        `, [yesterdayStr]);

        console.log(`Found ${users.length} users who haven't filled sadhana for ${yesterdayStr}`);

        for (const user of users) {
            try {
                await sendReminderEmail(user.email, user.username, yesterdayStr);
                console.log(`Reminder sent to ${user.email}`);
            } catch (err) {
                console.error(`Failed to send reminder to ${user.email}:`, err.message);
            }
        }
    } catch (error) {
        console.error('Error in reminder task:', error);
    }
});
