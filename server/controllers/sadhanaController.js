const db = require('../config/db');

exports.createOrUpdateLog = async (req, res) => {
    const { date, rounds, reading_time, hearing_time, study_time, dayrest_time, mangala_aarti, wakeup_time, sleep_time, service_hours, comments } = req.body;
    const userId = req.user.id;

    try {
        const [existing] = await db.query('SELECT * FROM daily_sadhana WHERE user_id = ? AND date = ?', [userId, date]);

        if (existing.length > 0) {
            await db.query(`UPDATE daily_sadhana SET rounds=?, reading_time=?, hearing_time=?, study_time=?, dayrest_time=?, mangala_aarti=?, wakeup_time=?, sleep_time=?, service_hours=?, comments=? WHERE id=?`,
                [rounds, reading_time, hearing_time, study_time || 0, dayrest_time || 0, mangala_aarti, wakeup_time, sleep_time, service_hours, comments, existing[0].id]);
            return res.json({ message: 'Report updated' });
        } else {
            await db.query(`INSERT INTO daily_sadhana (user_id, date, rounds, reading_time, hearing_time, study_time, dayrest_time, mangala_aarti, wakeup_time, sleep_time, service_hours, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, date, rounds, reading_time, hearing_time, study_time || 0, dayrest_time || 0, mangala_aarti, wakeup_time, sleep_time, service_hours, comments]);
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

// Admin/Owner: fetch logs for all users in a group (or all) for a date range
exports.getGroupLogs = async (req, res) => {
    const { group, startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate are required' });

    try {
        // Build group filter — brahmacari/owner see all, else filter by group_permissions
        let groupClause = '';
        const params = [startDate, endDate];

        if (group && group !== 'all') {
            groupClause = 'AND u.group_name = ?';
            params.push(group);
        } else if (req.user.role !== 'owner' && req.user.group_name !== 'brahmacari') {
            // Regular admin: only their permitted groups
            let perms = req.user.group_permissions;
            if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch { perms = []; } }
            if (!Array.isArray(perms) || perms.length === 0) return res.status(403).json({ message: 'No group permissions' });
            groupClause = `AND u.group_name IN (${perms.map(() => '?').join(',')})`;
            params.push(...perms);
        }

        // Exclude owner and brahmacari from results always
        const ownerClause = req.user.role !== 'owner' ? 'AND u.role != "owner"' : '';

        const [rows] = await db.query(
            `SELECT u.id AS user_id, u.username, u.group_name,
                    ds.date, ds.rounds, ds.reading_time, ds.hearing_time,
                    ds.study_time, ds.service_hours, ds.mangala_aarti,
                    ds.wakeup_time, ds.sleep_time, ds.comments
             FROM users u
             LEFT JOIN daily_sadhana ds ON ds.user_id = u.id AND ds.date BETWEEN ? AND ?
             WHERE u.role != 'owner' AND (u.group_name IS NULL OR u.group_name != 'brahmacari') ${groupClause} ${ownerClause}
             ORDER BY u.group_name, u.username, ds.date ASC`,
            params
        );

        // Group rows by user
        const usersMap = {};
        for (const row of rows) {
            if (!usersMap[row.user_id]) {
                usersMap[row.user_id] = { user_id: row.user_id, username: row.username, group_name: row.group_name, logs: [] };
            }
            if (row.date) usersMap[row.user_id].logs.push(row);
        }

        res.json(Object.values(usersMap));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

