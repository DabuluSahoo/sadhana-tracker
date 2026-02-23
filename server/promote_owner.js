const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
};

async function promoteToOwner(username) {
    if (!username) {
        console.log('❌ Please provide a username.');
        process.exit(1);
    }

    let connection;
    try {
        console.log(`Connecting to database to promote '${username}'...`);
        connection = await mysql.createConnection(dbConfig);

        const [result] = await connection.execute(
            'UPDATE users SET role = "owner" WHERE username = ?',
            [username]
        );

        if (result.affectedRows > 0) {
            console.log(`✅ Success! User '${username}' is now the OWNER.`);
        } else {
            console.log(`❌ User '${username}' not found. Please check the username.`);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

promoteToOwner(process.argv[2]);
