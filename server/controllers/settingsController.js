const db = require('../config/db');

// --- Global Broadcast ---

exports.getBroadcast = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT value_text FROM admin_settings WHERE key_name = "global_broadcast"');
        res.json({ broadcast: rows[0]?.value_text || '' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateBroadcast = async (req, res) => {
    const { broadcast } = req.body;
    try {
        await db.query(
            'INSERT INTO admin_settings (key_name, value_text) VALUES ("global_broadcast", ?) ON DUPLICATE KEY UPDATE value_text = ?',
            [broadcast, broadcast]
        );
        res.json({ message: 'Broadcast updated successfully', broadcast });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- Group Quotas ---

exports.getAllQuotas = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM group_quotas');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getQuotaByGroup = async (req, res) => {
    const { groupName } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM group_quotas WHERE group_name = ?', [groupName]);
        if (rows.length === 0) return res.status(404).json({ message: 'Quota not found for this group' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateQuota = async (req, res) => {
    const { groupName } = req.params;
    const { read_target, hear_target, wake_target, sleep_target, study_target, placement_target } = req.body;
    try {
        await db.query(
            `INSERT INTO group_quotas (group_name, read_target, hear_target, wake_target, sleep_target, study_target, placement_target) 
             VALUES (?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
                read_target = VALUES(read_target), 
                hear_target = VALUES(hear_target), 
                wake_target = VALUES(wake_target), 
                sleep_target = VALUES(sleep_target),
                study_target = VALUES(study_target),
                placement_target = VALUES(placement_target)`,
            [groupName, read_target, hear_target, wake_target, sleep_target, study_target, placement_target]
        );
        res.json({ message: `Quotas for ${groupName} updated successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
