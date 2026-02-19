const db = require('../config/db');

exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, email, role, created_at FROM users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getUserLogs = async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    try {
        // Get total count for pagination metadata
        const [countResult] = await db.query('SELECT count(*) as total FROM daily_sadhana WHERE user_id = ?', [userId]);
        const totalLogs = countResult[0].total;
        const totalPages = Math.ceil(totalLogs / limit);

        // Get paginated logs
        const [logs] = await db.query('SELECT * FROM daily_sadhana WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?', [userId, limit, offset]);

        res.json({
            logs,
            pagination: {
                totalLogs,
                totalPages,
                currentPage: page,
                limit
            }
        });
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
