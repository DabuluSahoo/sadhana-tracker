const mysql = require('mysql2/promise');

async function checkUsers() {
    const config = {
        host: 'tidb.wsahoo.space',
        port: 4000,
        user: 'dibyendu',
        password: 'Dibyendu@123',
        database: 'sadhana_tracker',
        ssl: {
            rejectUnauthorized: false
        }
    };

    console.log('Connecting to TiDB Cloud at', config.host);

    try {
        const connection = await mysql.createConnection(config);
        const [rows] = await connection.execute('SELECT id, username, role, device_token FROM users');
        console.table(rows);
        await connection.end();
    } catch (err) {
        console.error('Error querying database:', err.message);
    }
}

checkUsers();
