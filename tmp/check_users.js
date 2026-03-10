const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function checkUsers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
    });

    try {
        const [rows] = await connection.execute('SELECT id, username, role, device_token FROM users');
        console.table(rows);
    } catch (err) {
        console.error('Error querying database:', err.message);
    } finally {
        await connection.end();
    }
}

checkUsers();
