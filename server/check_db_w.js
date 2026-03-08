const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUserW() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('\n--- CONNECTION SUCCESSFUL ---\n');
        
        // Query only basic columns that should definitely exist
        const [rows] = await connection.execute('SELECT id, username, email, role FROM users WHERE username = ?', ['W']);
        
        if (rows.length > 0) {
            console.log('✅ User "W" found locally:');
            console.log(JSON.stringify(rows[0], null, 2));
        } else {
            console.log('❌ User "W" NOT found in the LOCAL database.');
            const [all] = await connection.execute('SELECT username FROM users');
            console.log('Users in local DB:', all.map(u => u.username));
        }

    } catch (err) {
        console.error('❌ Database Error:', err.message);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

checkUserW();
