const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'C:/Users/dabul/OneDrive/Desktop/ANTI/sadhana-app/server/.env' });

async function setupV2() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
    console.log('Connected to TiDB Cloud');

    try {
        // 1. Create admin_settings
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admin_settings (
                key_name VARCHAR(255) PRIMARY KEY,
                value_text TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Created admin_settings table');

        // 2. Seed broadcast
        await connection.query(`
            INSERT IGNORE INTO admin_settings (key_name, value_text) 
            VALUES ('global_broadcast', 'Welcome to the new Spiritual Analytics system!')
        `);
        console.log('Seeded global_broadcast');

        // 3. Create group_quotas
        await connection.query(`
            CREATE TABLE IF NOT EXISTS group_quotas (
                group_name VARCHAR(50) PRIMARY KEY,
                read_target INT DEFAULT 0 COMMENT 'in minutes',
                hear_target INT DEFAULT 0 COMMENT 'in minutes',
                wake_target TIME DEFAULT '05:00:00',
                sleep_target TIME DEFAULT '22:00:00',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Created group_quotas table');

        // 4. Seed quotas
        const quotas = [
            ['bhima', 30, 30, '05:00:00', '22:00:00'],
            ['arjun', 30, 30, '05:00:00', '22:00:00'],
            ['nakul', 30, 30, '05:00:00', '22:00:00'],
            ['sahadev', 30, 30, '05:00:00', '22:00:00'],
            ['other', 0, 0, '05:30:00', '22:30:00'],
            ['yudhisthir', 45, 45, '04:30:00', '22:00:00'],
            ['brahmacari', 60, 60, '04:00:00', '22:00:00']
        ];

        for (const [name, read, hear, wake, sleep] of quotas) {
            await connection.query(`
                INSERT IGNORE INTO group_quotas (group_name, read_target, hear_target, wake_target, sleep_target)
                VALUES (?, ?, ?, ?, ?)
            `, [name, read, hear, wake, sleep]);
        }
        console.log('Seeded initial quotas');

        // 5. Add admin_comment to daily_sadhana
        try {
            await connection.query(`ALTER TABLE daily_sadhana ADD COLUMN admin_comment TEXT AFTER comments`);
            console.log('Added admin_comment column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('admin_comment column already exists');
            } else {
                throw e;
            }
        }

        console.log('Database V2 setup complete! 🕉️');
    } catch (err) {
        console.error('Setup failed:', err);
    } finally {
        await connection.end();
    }
}

setupV2();
