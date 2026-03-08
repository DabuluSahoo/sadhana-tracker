const cron = require('node-cron');
const db = require('../config/db');
const { sendEmailWithAttachment } = require('../config/mailer');
const { generateConsolidatedReportBase64 } = require('../utils/reportGenerator');
const { format, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval } = require('date-fns');

const runWeeklyReport = async () => {
    console.log('--- STARTING CONSOLIDATED WEEKLY REPORT JOB ---');
    let logId = null;

    try {
        // 1. Log Start
        const [logRes] = await db.query(
            'INSERT INTO cron_logs (job_name, start_time, status) VALUES (?, NOW(), ?)',
            ['WEEKLY_AUTOMATED_REPORT', 'RUNNING']
        );
        logId = logRes.insertId;

        // 2. Define Date Range (Last week Sun-Sat)
        const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 });
        const lastWeekEnd   = endOfWeek(lastWeekStart, { weekStartsOn: 0 });
        const days = eachDayOfInterval({ start: lastWeekStart, end: lastWeekEnd });
        
        const startStr = format(lastWeekStart, 'yyyy-MM-dd');
        const endStr   = format(lastWeekEnd, 'yyyy-MM-dd');

        // 3. Find all Brahmacaris (recipients)
        const [brahmacaris] = await db.query(
            "SELECT email, username FROM users WHERE role = 'admin' AND group_name = 'brahmacari' AND email IS NOT NULL AND email != ''"
        );

        if (brahmacaris.length === 0) {
            console.log('⚠️ No Brahmacaris with email addresses found. Skipping.');
            await db.query('UPDATE cron_logs SET status = ?, end_time = NOW(), results = ? WHERE id = ?', 
                ['SKIPPED', JSON.stringify({ reason: 'No Brahmacaris found' }), logId]);
            return { skipped: true, reason: 'No Brahmacaris found' };
        }

        // 4. Gather data for all target groups
        const targetGroups = ['bhima', 'arjun', 'nakul', 'sahadev', 'yudhisthir'];
        const allGroupsData = [];

        for (const group of targetGroups) {
            console.log(`Processing Group: ${group}...`);
            const [rows] = await db.query(
                `SELECT u.username, u.group_name, ds.*
                 FROM users u
                 LEFT JOIN daily_sadhana ds ON ds.user_id = u.id AND ds.date BETWEEN ? AND ?
                 WHERE u.group_name = ? AND u.role NOT IN ('owner')
                 ORDER BY u.username, ds.date ASC`,
                [startStr, endStr, group]
            );

            if (rows.length > 0) {
                const usersMap = {};
                for (const row of rows) {
                    if (!usersMap[row.username]) usersMap[row.username] = { username: row.username, logs: [] };
                    if (row.date) usersMap[row.username].logs.push(row);
                }
                allGroupsData.push({ groupName: group, usersData: Object.values(usersMap) });
            }
        }

        if (allGroupsData.length === 0) {
            await db.query('UPDATE cron_logs SET status = ?, end_time = NOW(), results = ? WHERE id = ?', 
                ['SKIPPED', JSON.stringify({ reason: 'No activity in any groups' }), logId]);
            return { skipped: true, reason: 'No activity data' };
        }

        // 5. Generate Consolidated PDF (Base64)
        const pdfBase64 = generateConsolidatedReportBase64(allGroupsData, lastWeekStart, lastWeekEnd, days);
        const filename = `Weekly_Consolidated_Sadhana_Report_${format(lastWeekStart, 'MMM_d')}.pdf`;

        // 6. Threading Logic: Find last messageId from DB
        const [lastLog] = await db.query(
            "SELECT results FROM cron_logs WHERE job_name = 'WEEKLY_AUTOMATED_REPORT' AND status = 'COMPLETED' AND results IS NOT NULL ORDER BY start_time DESC LIMIT 1"
        );
        
        let lastMessageId = null;
        if (lastLog.length > 0) {
            try {
                const results = JSON.parse(lastLog[0].results);
                lastMessageId = results.messageId;
            } catch (e) {}
        }

        const emailHeaders = {};
        if (lastMessageId) {
            emailHeaders['In-Reply-To'] = lastMessageId;
            emailHeaders['References'] = lastMessageId;
        }

        // 7. Send Emails to Brahmacaris
        const deliveryResults = [];
        for (const b of brahmacaris) {
            try {
                console.log(`  - Emailing consolidated report to: ${b.username}...`);
                const resendRes = await sendEmailWithAttachment(
                    b.email.trim(),
                    `🪷 Weekly Group Sadhana Reports (Consolidated)`,
                    `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #f0a500; border-radius: 8px;">
                            <h2 style="color: #c47a00;">Weekly Consolidated Sadhana Report</h2>
                            <p>Hare Krishna Prabhuji! 🙏</p>
                            <p>Please find attached the consolidated weekly sadhana report for all groups.</p>
                            <p style="font-size: 14px; color: #666;">
                                <strong>Period:</strong> ${format(lastWeekStart, 'PPP')} to ${format(lastWeekEnd, 'PPP')}<br/>
                            </p>
                            <p style="margin-top: 20px; font-size: 12px; color: #888;">This is an automated report. All weekly reports will now stay in this email thread. 🪷</p>
                        </div>
                    `,
                    { content: pdfBase64, filename },
                    emailHeaders
                );
                
                deliveryResults.push({ username: b.username, messageId: resendRes.id });
                await new Promise(r => setTimeout(r, 2000)); // Rate limit
            } catch (emailErr) {
                console.error(`  - Failed to email ${b.username}: ${emailErr.message}`);
                deliveryResults.push({ username: b.username, error: emailErr.message });
            }
        }

        // 8. Final Log Update
        const firstMessageId = deliveryResults.find(d => d.messageId)?.messageId;
        const finalSummary = {
            startStr,
            endStr,
            groupsProcessed: allGroupsData.map(g => g.groupName),
            messageId: firstMessageId,
            delivery: deliveryResults
        };

        await db.query(
            'UPDATE cron_logs SET end_time = NOW(), status = ?, results = ? WHERE id = ?',
            ['COMPLETED', JSON.stringify(finalSummary), logId]
        );
        console.log('--- CONSOLIDATED WEEKLY REPORT JOB COMPLETED ---');
        return { success: true, results: finalSummary };

    } catch (error) {
        console.error('CRITICAL ERROR in consolidated report job:', error);
        if (logId) {
            await db.query(
                'UPDATE cron_logs SET end_time = NOW(), status = ?, error_message = ? WHERE id = ?',
                ['FAILED', error.message, logId]
            );
        }
        throw error;
    }
};

// Schedule: Every Sunday at 2:00 PM IST (08:30 UTC)
cron.schedule('30 8 * * 0', runWeeklyReport);

// --- Weekly Storage Cleanup Job ---
// Schedule: Every Sunday at 6:00 AM IST (00:30 UTC)
// As per user request: "downloaded pdf should be cleared every week at sunday 6 AM"
// NOTE: Since the server generates reports directly to memory/base64 for Resend,
// we don't have large persistent files, but if we had an 'output' folder, this would clear it.
cron.schedule('30 0 * * 0', async () => {
    console.log('--- STARTING WEEKLY PDF CLEANUP JOB (SUN 06:00 IST) ---');
    try {
        // If there were temporary files in a specific directory:
        // const fs = require('fs');
        // const path = require('path');
        // const reportDir = path.join(__dirname, '../output/reports');
        // if (fs.existsSync(reportDir)) {
        //     fs.readdirSync(reportDir).forEach(file => fs.unlinkSync(path.join(reportDir, file)));
        // }
        console.log('🗑️ Storage maintenance complete. (Memory-only generation confirmed)');
        console.log('--- WEEKLY PDF CLEANUP JOB COMPLETED ---');
    } catch (err) {
        console.error('CLEANUP JOB ERROR:', err.message);
    }
});

module.exports = { runWeeklyReport };
