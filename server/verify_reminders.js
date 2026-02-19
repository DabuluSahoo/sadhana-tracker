const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');
village;

async function verify() {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        console.log(`--- REMINDER VERIFICATION SCRIPT ---`);
        console.log(`Target Date: ${yesterdayStr}`);

        // 1. Total Users
        const [allUsers] = await db.query('SELECT count(*) as count FROM users');
        console.log(`Total Users in DB: ${allUsers[0].count}`);

        // 2. Users with Emails
        const [emailUsers] = await db.query("SELECT count(*) as count FROM users WHERE email IS NOT NULL AND email != ''");
        console.log(`Users with valid email field: ${emailUsers[0].count}`);

        // 3. Users who already submitted for yesterday
        const [submitted] = await db.query('SELECT count(*) as count FROM daily_sadhana WHERE date = ?', [yesterdayStr]);
        console.log(`Users who ALREADY submitted for ${yesterdayStr}: ${submitted[0].count}`);

        // 4. Listing users who SHOULD receive the reminder
        const [toRemind] = await db.query(`
            SELECT id, username, email
            FROM users 
            WHERE email IS NOT NULL 
              AND email != ''
              AND id NOT IN (
                  SELECT user_id FROM daily_sadhana WHERE date = ?
              )
        `, [yesterdayStr]);

        console.log(`\nUsers who WILL be reminded (${toRemind.length}):`);
        if (toRemind.length === 0) {
            console.log("None. (Either everyone submitted, or no one has an email address)");
        } else {
            toRemind.forEach(u => {
                console.log(`- ${u.username} (${u.email})`);
            });
        }

        // 5. Checking for "Broken" accounts (empty or null emails)
        const [broken] = await db.query("SELECT username FROM users WHERE email IS NULL OR email = ''");
        if (broken.length > 0) {
            console.log(`\n⚠️ WARNING: The following users have NO email and can NEVER receive reminders:`);
            broken.forEach(u => console.log(`- ${u.username}`));
        }

        console.log(`\n--- VERIFICATION COMPLETE ---`);
        process.exit(0);
    } catch (err) {
        console.error('Error during verification:', err);
        process.exit(1);
    }
}

verify();
