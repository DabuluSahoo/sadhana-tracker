require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function setupSettings() {
    try {
        console.log('Connecting to TiDB...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value TEXT NOT NULL
            )
        `);
        console.log('✅ Added settings table');

        await db.query(`INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('latest_apk_version', '1.0.0')`);
        await db.query(`INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('apk_download_url', '')`);
        console.log('✅ Inserted default settings');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing schema:', err);
        process.exit(1);
    }
}

setupSettings();
