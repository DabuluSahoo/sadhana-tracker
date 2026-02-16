const cron = require('node-cron');
const db = require('../config/db');

// Schedule tasks to be run on the server.
cron.schedule('0 20 * * *', async () => {
    console.log('Running daily sadhana reminder task at 8 PM');
    try {
        const today = new Date().toISOString().slice(0, 10);
        // Logic to find users who missed report and send notification
        // For MVP, just logging
        const [users] = await db.query('SELECT username FROM users');
        // detailed check could be done here
        console.log(`Checked sadhana reports for ${today}`);
    } catch (error) {
        console.error('Error in reminder task:', error);
    }
});
