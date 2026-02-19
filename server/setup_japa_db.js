const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function setupJapaDB() {
    try {
        console.log('--- SETTING UP JAPA COUNTER DATABASE ---');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS japa_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                date DATE NOT NULL,
                beads_count INT DEFAULT 0,
                rounds_completed INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_date_japa (user_id, date)
            )
        `;

        await db.query(createTableQuery);
        console.log('✅ Table "japa_logs" created/verified successfully.');

        console.log('--- JAPA DB SETUP COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error setting up Japa DB:', err);
        process.exit(1);
    }
}

setupJapaDB();
