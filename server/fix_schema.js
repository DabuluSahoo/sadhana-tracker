const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function fixSchema() {
    try {
        console.log('--- FIXING DATABASE SCHEMA ---');

        // Check if email column exists
        const [columns] = await db.query('SHOW COLUMNS FROM users LIKE "email"');

        if (columns.length === 0) {
            console.log('Adding missing "email" column to users table...');
            await db.query('ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE AFTER id');
            console.log('✅ Column "email" added successfully.');
        }

        // Check for otp_tokens table
        try {
            await db.query('SELECT 1 FROM otp_tokens LIMIT 1');
        } catch (e) {
            console.log('Creating missing "otp_tokens" table...');
            await db.query(`
                CREATE TABLE IF NOT EXISTS otp_tokens (
                    email VARCHAR(255) PRIMARY KEY,
                    otp VARCHAR(6) NOT NULL,
                    expires_at DATETIME NOT NULL
                )
            `);
            console.log('✅ Table "otp_tokens" created successfully.');
        }

        // Check for cron_logs table
        try {
            await db.query('SELECT 1 FROM cron_logs LIMIT 1');
            // console.log('Table "cron_logs" already exists.');
        } catch (e) {
            console.log('Creating missing "cron_logs" table...');
            await db.query(`
                CREATE TABLE IF NOT EXISTS cron_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    job_name VARCHAR(255) NOT NULL,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME NULL,
                    status VARCHAR(50) DEFAULT 'RUNNING',
                    results JSON NULL,
                    error_message TEXT NULL
                )
            `);
            console.log('✅ Table "cron_logs" created successfully.');
        }

        console.log('--- SCHEMA FIX COMPLETED ---');
    } catch (err) {
        console.error('❌ Error fixing schema:', err);
        // Don't exit, let the server try to start anyway
    }
}

module.exports = fixSchema;
// Run if called directly, but not when required
if (require.main === module) {
    fixSchema().then(() => process.exit(0)).catch(() => process.exit(1));
}
