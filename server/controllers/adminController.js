const db = require('../config/db');

exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, role, created_at FROM users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getUserLogs = async (req, res) => {
    const { userId } = req.params;
    try {
        const [logs] = await db.query('SELECT * FROM daily_sadhana WHERE user_id = ? ORDER BY date DESC', [userId]);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.editUserLog = async (req, res) => {
    const { logId } = req.params;
    const { rounds, reading_time, hearing_time, mangala_aarti, wakeup_time, sleep_time, service_hours, comments } = req.body;

    try {
        await db.query(`UPDATE daily_sadhana SET rounds=?, reading_time=?, hearing_time=?, mangala_aarti=?, wakeup_time=?, sleep_time=?, service_hours=?, comments=? WHERE id=?`,
            [rounds, reading_time, hearing_time, mangala_aarti, wakeup_time, sleep_time, service_hours, comments, logId]);
        res.json({ message: 'Log updated by admin' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
