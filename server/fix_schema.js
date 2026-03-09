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

        // Check if device_token column exists
        const [tokenColumns] = await db.query('SHOW COLUMNS FROM users LIKE "device_token"');
        if (tokenColumns.length === 0) {
            console.log('Adding "device_token" column to users table...');
            await db.query('ALTER TABLE users ADD COLUMN device_token VARCHAR(255) DEFAULT NULL');
            console.log('✅ Column "device_token" added successfully.');
        }

        // Ensure group_name column exists
        const [gnColumns] = await db.query('SHOW COLUMNS FROM users LIKE "group_name"');
        if (gnColumns.length === 0) {
            console.log('Adding missing "group_name" column to users table...');
            await db.query("ALTER TABLE users ADD COLUMN group_name ENUM('bhima','arjun','nakul','sahadev','brahmacari','yudhisthir','other') DEFAULT NULL AFTER role");
            console.log('✅ Column "group_name" added successfully.');
        }

        // Ensure group_permissions column exists
        const [gpColumns] = await db.query('SHOW COLUMNS FROM users LIKE "group_permissions"');
        if (gpColumns.length === 0) {
            console.log('Adding missing "group_permissions" column to users table...');
            await db.query("ALTER TABLE users ADD COLUMN group_permissions JSON DEFAULT NULL AFTER group_name");
            console.log('✅ Column "group_permissions" added successfully.');
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

        // Check and add indexes for speed optimization
        const [indices] = await db.query('SHOW INDEX FROM users');
        const indexNames = indices.map(idx => idx.Key_name);

        if (!indexNames.includes('idx_group_name')) {
            console.log('Creating index "idx_group_name" on users table...');
            await db.query('CREATE INDEX idx_group_name ON users(group_name)');
            console.log('✅ Index "idx_group_name" created.');
        }

        if (!indexNames.includes('idx_role')) {
            console.log('Creating index "idx_role" on users table...');
            await db.query('CREATE INDEX idx_role ON users(role)');
            console.log('✅ Index "idx_role" created.');
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
