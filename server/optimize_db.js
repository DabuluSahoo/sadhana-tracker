const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function optimizeDatabase() {
    try {
        console.log('--- OPTIMIZING DATABASE SCHEMA ---');

        // Check if index already exists
        const [indexes] = await db.query('SHOW INDEX FROM daily_sadhana WHERE Key_name = "idx_user_date"');

        if (indexes.length === 0) {
            console.log('Adding compound index (user_id, date) to daily_sadhana...');
            await db.query('CREATE INDEX idx_user_date ON daily_sadhana(user_id, date DESC)');
            console.log('✅ Index "idx_user_date" created successfully.');
        } else {
            console.log('Index "idx_user_date" already exists.');
        }

        console.log('--- OPTIMIZATION COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error optimizing database:', err);
        process.exit(1);
    }
}

optimizeDatabase();
