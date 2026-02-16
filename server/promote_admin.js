const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

async function promoteToAdmin(username) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const [result] = await connection.execute(
            'UPDATE users SET role = "admin" WHERE username = ?',
            [username]
        );

        if (result.affectedRows > 0) {
            console.log(`Success! User '${username}' is now an Admin.`);
        } else {
            console.log(`User '${username}' not found.`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

const username = process.argv[2];

if (!username) {
    console.log('Please provide a username.');
    console.log('Usage: node promote_admin.js <username>');
    process.exit(1);
}

promoteToAdmin(username);
