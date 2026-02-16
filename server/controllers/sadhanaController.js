const db = require('../config/db');

exports.createOrUpdateLog = async (req, res) => {
    const { date, rounds, reading_time, hearing_time, mangala_aarti, wakeup_time, sleep_time, service_hours, comments } = req.body;
    const userId = req.user.id;

    try {
        const [existing] = await db.query('SELECT * FROM daily_sadhana WHERE user_id = ? AND date = ?', [userId, date]);

        if (existing.length > 0) {
            await db.query(`UPDATE daily_sadhana SET rounds=?, reading_time=?, hearing_time=?, mangala_aarti=?, wakeup_time=?, sleep_time=?, service_hours=?, comments=? WHERE id=?`,
                [rounds, reading_time, hearing_time, mangala_aarti, wakeup_time, sleep_time, service_hours, comments, existing[0].id]);
            return res.json({ message: 'Report updated' });
        } else {
            await db.query(`INSERT INTO daily_sadhana (user_id, date, rounds, reading_time, hearing_time, mangala_aarti, wakeup_time, sleep_time, service_hours, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, date, rounds, reading_time, hearing_time, mangala_aarti, wakeup_time, sleep_time, service_hours, comments]);
            return res.status(201).json({ message: 'Report submitted' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getWeeklyLogs = async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate } = req.query; // Expect YYYY-MM-DD

    try {
        const [logs] = await db.query('SELECT * FROM daily_sadhana WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC', [userId, startDate, endDate]);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const [logs] = await db.query('SELECT * FROM daily_sadhana WHERE user_id = ? ORDER BY date DESC LIMIT 30', [userId]);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
