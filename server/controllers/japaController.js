const db = require('../config/db');

// Get today's Japa progress
exports.getTodayProgress = async (req, res) => {
    const userId = req.user.userId;
    const today = new Date().toISOString().slice(0, 10);

    try {
        const [rows] = await db.query(
            'SELECT * FROM japa_logs WHERE user_id = ? AND date = ?',
            [userId, today]
        );

        if (rows.length === 0) {
            return res.json({ beads_count: 0, rounds_completed: 0 });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Sync Japa progress (Upsert)
exports.syncProgress = async (req, res) => {
    const userId = req.user.userId;
    const { beads_count, rounds_completed } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    try {
        const [existing] = await db.query(
            'SELECT id FROM japa_logs WHERE user_id = ? AND date = ?',
            [userId, today]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE japa_logs SET beads_count = ?, rounds_completed = ? WHERE id = ?',
                [beads_count, rounds_completed, existing[0].id]
            );
        } else {
            await db.query(
                'INSERT INTO japa_logs (user_id, date, beads_count, rounds_completed) VALUES (?, ?, ?, ?)',
                [userId, today, beads_count, rounds_completed]
            );
        }

        res.json({ message: 'Progress synced' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get Japa History
exports.getHistory = async (req, res) => {
    const userId = req.user.userId;

    try {
        const [rows] = await db.query(
            'SELECT date, rounds_completed FROM japa_logs WHERE user_id = ? ORDER BY date DESC LIMIT 7',
            [userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
