const db = require('./config/db');

async function checkTokens() {
    try {
        const [users] = await db.query('SELECT id, username, role, group_name, device_token FROM users WHERE device_token IS NOT NULL');
        console.log('Users with Device Tokens:');
        users.forEach(u => {
            console.log(`ID: ${u.id}, User: ${u.username}, Role: ${u.role}, Group: ${u.group_name}, Token: ${u.device_token.substring(0, 20)}...`);
        });

        const todayStr = new Date().toISOString().slice(0, 10);
        const [toLock] = await db.query(`
            SELECT id, username, device_token 
            FROM users 
            WHERE device_token IS NOT NULL 
              AND role != 'owner' 
              AND group_name NOT IN ('brahmacari', 'other', 'yudhisthir')
              AND id NOT IN (
                  SELECT user_id FROM daily_sadhana WHERE date = ?
              )
        `, [todayStr]);

        console.log('\nUsers that would be LOCKED:');
        toLock.forEach(u => {
            console.log(`ID: ${u.id}, User: ${u.username}, Token: ${u.device_token.substring(0, 20)}...`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTokens();
