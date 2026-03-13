const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const db = require('../server/config/db');

async function checkDevoteeToken() {
    try {
        const [users] = await db.query('SELECT username, role, device_token FROM users WHERE role != "owner" AND device_token IS NOT NULL');
        console.log('Users with device tokens (excluding owner):');
        console.table(users);
        
        const [allDevotees] = await db.query('SELECT username, role, device_token FROM users WHERE role != "owner"');
        console.log('\nAll non-owner users:');
        console.table(allDevotees);
    } catch (err) {
        console.error('Error checking tokens:', err);
    } finally {
        process.exit();
    }
}

checkDevoteeToken();
