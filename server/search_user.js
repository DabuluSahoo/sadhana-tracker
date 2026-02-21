const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function checkUser(searchEmail) {
    try {
        console.log(`--- CHECKING USER: ${searchEmail} ---`);

        // Find user
        const [users] = await db.query('SELECT id, username, email FROM users WHERE email LIKE ?', [`%${searchEmail}%`]);
        if (users.length === 0) {
            console.log('❌ No user found with that email.');
        } else {
            console.table(users);
            const user = users[0];

            // Check yesterday's sadhana
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().slice(0, 10);

            console.log(`Checking sadhana for yesterday (${yStr})...`);
            const [logs] = await db.query('SELECT * FROM daily_sadhana WHERE user_id = ? AND date = ?', [user.id, yStr]);

            if (logs.length > 0) {
                console.log('✅ User ALREADY submitted their report for yesterday. (This is why they were skipped!)');
                console.table(logs);
            } else {
                console.log('❌ User has NOT submitted their report for yesterday. (They should have received a reminder)');
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

const email = process.argv[2] || 'subhmjit';
checkUser(email);
