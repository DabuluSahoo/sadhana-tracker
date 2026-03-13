const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const db = require('../server/config/db');

async function checkDevoteeToken() {
    try {
        const [users] = await db.query('SELECT username, role, device_token FROM users');
        console.log('All users in database:');
        console.table(users);
    } catch (err) {
        console.error('Error checking tokens:', err);
    } finally {
        process.exit();
    }
}

checkDevoteeToken();
