const db = require('./config/db');

async function findOwner() {
    try {
        const [rows] = await db.query('SELECT id, username, email, role FROM users WHERE role = "owner"');
        if (rows.length > 0) {
            console.log('--- OWNER ACCOUNT FOUND ---');
            rows.forEach(r => {
                console.log(`ID: ${r.id}, Username: ${r.username}, Email: ${r.email || 'NULL'}, Role: ${r.role}`);
            });
        } else {
            console.log('❌ No owner account found.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

findOwner();
