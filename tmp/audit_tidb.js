const mysql = require('../server/node_modules/mysql2/promise');

async function auditTiDB() {
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

    console.log('--- TiDB PRODUCTION AUDIT ---');
    console.log('Connecting to:', config.host);

    try {
        const connection = await mysql.createConnection(config);
        
        const [users] = await connection.execute('SELECT id, username, role, device_token FROM users');
        console.log(`\nFound ${users.length} users in TiDB:`);
        console.table(users);

        const [tokens] = await connection.execute('SELECT username, device_token FROM users WHERE device_token IS NOT NULL');
        console.log('\nUsers with Active Push Tokens:');
        console.table(tokens);

        await connection.end();
    } catch (err) {
        console.error('❌ TiDB Connection Error:', err.message);
    } finally {
        process.exit();
    }
}

auditTiDB();
