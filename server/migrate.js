const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function migrate() {
    console.log('Connecting to TiDB Cloud...');
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 4000,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Checking group_quotas schema...');
        const [cols] = await db.query('DESCRIBE group_quotas');
        const fields = cols.map(c => c.Field);

        if (!fields.includes('japa_target')) {
            console.log('Adding japa_target...');
            await db.query('ALTER TABLE group_quotas ADD COLUMN japa_target VARCHAR(10) DEFAULT "10:00"');
        } else {
            console.log('japa_target already exists.');
        }

        if (!fields.includes('rest_target')) {
            console.log('Adding rest_target...');
            await db.query('ALTER TABLE group_quotas ADD COLUMN rest_target INT DEFAULT 30');
        } else {
            console.log('rest_target already exists.');
        }

        if (!fields.includes('nrcm_target')) {
            console.log('Adding nrcm_target...');
            await db.query('ALTER TABLE group_quotas ADD COLUMN nrcm_target INT DEFAULT 1');
        } else {
            console.log('nrcm_target already exists.');
        }

        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await db.end();
    }
}

migrate();
