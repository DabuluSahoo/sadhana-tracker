const mysql = require('../server/node_modules/mysql2/promise');

async function checkWtest2() {
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

    console.log('--- Wtest2 PUSH AUDIT ---');

    try {
        const connection = await mysql.createConnection(config);
        
        // 1. Check if user exists and has a token
        const [users] = await connection.execute('SELECT id, username, device_token, role FROM users WHERE username = "Wtest2"');
        console.log('\nUser info for Wtest2:');
        console.table(users);

        if (users.length > 0 && users[0].device_token) {
            console.log('✅ Wtest2 has a registered device token.');
        } else if (users.length > 0) {
            console.log('❌ Wtest2 exists but has NULL device_token.');
        } else {
            console.log('❌ User Wtest2 not found in TiDB.');
        }

        // 2. Check for recent cron logs (if we logged specific user deliveries)
        // Note: cron_logs might contain results as JSON
        const [logs] = await connection.execute('SELECT * FROM cron_logs WHERE job_name = "daily_sadhana_reminder" ORDER BY start_time DESC LIMIT 5');
        console.log('\nRecent Reminder Logs:');
        // console.table(logs); // JSON results might be long, let's just check the last one carefully
        
        if (logs.length > 0) {
            logs.forEach(log => {
                console.log(`[${log.start_time}] Status: ${log.status}`);
                // if (log.results) console.log('Results:', log.results);
            });
        }

        await connection.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}

checkWtest2();
