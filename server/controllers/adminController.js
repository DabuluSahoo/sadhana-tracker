const db = require('../config/db');
const { sendUsernameChangeNotification } = require('../config/mailer');

// Helper: build a group filter clause for a given admin user
// Owner sees everyone. Admin sees only users in their group_permissions list.
const buildGroupFilter = (reqUser) => {
    if (reqUser.role === 'owner') return { clause: '', params: [] };

    let permissions = reqUser.group_permissions;
    if (typeof permissions === 'string') {
        try { permissions = JSON.parse(permissions); } catch { permissions = []; }
    }
    if (!Array.isArray(permissions) || permissions.length === 0) {
        // Admin with no group permissions granted — sees nothing
        return { clause: 'AND 1=0', params: [] };
    }
    const placeholders = permissions.map(() => '?').join(',');
    return { clause: `AND u.group_name IN (${placeholders})`, params: permissions };
};

exports.getAllUsers = async (req, res) => {
    const { clause, params } = buildGroupFilter(req.user);
    try {
        const [users] = await db.query(
            `SELECT id, username, email, role, group_name, group_permissions, created_at FROM users u WHERE 1=1 ${clause}`,
            params
        );
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

    // Verify the requesting admin actually has access to this user's group
    if (req.user.role !== 'owner') {
        let permissions = req.user.group_permissions;
        if (typeof permissions === 'string') { try { permissions = JSON.parse(permissions); } catch { permissions = []; } }
        if (!Array.isArray(permissions) || permissions.length === 0) {
            return res.status(403).json({ message: 'Access denied: no group permissions' });
        }
        const placeholders = permissions.map(() => '?').join(',');
        const [check] = await db.query(
            `SELECT id FROM users WHERE id = ? AND group_name IN (${placeholders})`,
            [userId, ...permissions]
        );
        if (check.length === 0) return res.status(403).json({ message: 'Access denied: user is not in your permitted groups' });
    }

    try {
        const [countResult] = await db.query('SELECT count(*) as total FROM daily_sadhana WHERE user_id = ?', [userId]);
        const totalLogs = countResult[0].total;
        const totalPages = Math.ceil(totalLogs / limit);
        const [logs] = await db.query('SELECT * FROM daily_sadhana WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?', [userId, limit, offset]);

        res.json({
            logs,
            pagination: { totalLogs, totalPages, currentPage: page, limit }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.editUserLog = async (req, res) => {
    const { logId } = req.params;
    const { rounds, reading_time, hearing_time, mangala_aarti, wakeup_time, sleep_time, service_hours, comments } = req.body;

    try {
        await db.query(
            `UPDATE daily_sadhana SET rounds=?, reading_time=?, hearing_time=?, mangala_aarti=?, wakeup_time=?, sleep_time=?, service_hours=?, comments=? WHERE id=?`,
            [rounds, reading_time, hearing_time, mangala_aarti, wakeup_time, sleep_time, service_hours, comments, logId]
        );
        res.json({ message: 'Log updated by admin' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.promoteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        await db.query('UPDATE users SET role = "admin" WHERE id = ?', [userId]);
        res.json({ message: 'User promoted to Admin successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.demoteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        await db.query('UPDATE users SET role = "devotee" WHERE id = ?', [userId]);
        res.json({ message: 'User demoted to Devotee successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Owner-only: assign group access permissions to an admin
exports.setAdminGroupPermissions = async (req, res) => {
    const { userId } = req.params;
    const { group_permissions } = req.body;
    const validGroups = ['bhima', 'arjun', 'nakul', 'sahadev'];

    if (!Array.isArray(group_permissions) || group_permissions.some(g => !validGroups.includes(g))) {
        return res.status(400).json({ message: 'Invalid group_permissions. Must be an array of valid group names.' });
    }

    try {
        const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        if (rows[0].role !== 'admin') return res.status(400).json({ message: 'Group permissions can only be set for admins' });

        await db.query('UPDATE users SET group_permissions = ? WHERE id = ?', [JSON.stringify(group_permissions), userId]);
        res.json({ message: 'Group permissions updated successfully', group_permissions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Owner-only: rename any user
exports.renameUser = async (req, res) => {
    const { userId } = req.params;
    const { username } = req.body;
    if (!username || !username.trim()) return res.status(400).json({ message: 'Username is required' });

    try {
        // Check new username isn't taken
        const [existing] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), userId]);
        if (existing.length > 0) return res.status(400).json({ message: 'Username already taken' });

        // Get current username and email before renaming
        const [rows] = await db.query('SELECT username, email FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        const oldUsername = rows[0].username;
        const userEmail = rows[0].email;

        // Do the rename
        await db.query('UPDATE users SET username = ? WHERE id = ?', [username.trim(), userId]);

        // Send email notification if the user has an email
        if (userEmail) {
            sendUsernameChangeNotification(userEmail, oldUsername, username.trim())
                .catch(err => console.error('Username change email failed:', err.message));
        }

        res.json({ message: 'User renamed successfully', username: username.trim() });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Owner-only: assign Brahmacari status (admin role + brahmacari group)
exports.assignBrahmacari = async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query('SELECT id, role FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        if (rows[0].role === 'owner') return res.status(400).json({ message: 'Cannot assign Brahmacari to the owner' });

        await db.query('UPDATE users SET role = "admin", group_name = "brahmacari" WHERE id = ?', [userId]);
        res.json({ message: 'User assigned as Brahmacari successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Owner-only: revoke Brahmacari status (keeps admin role, clears brahmacari group)
exports.revokeBrahmacari = async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query('SELECT group_name FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        if (rows[0].group_name !== 'brahmacari') return res.status(400).json({ message: 'User is not a Brahmacari' });

        await db.query('UPDATE users SET group_name = NULL WHERE id = ?', [userId]);
        res.json({ message: 'Brahmacari status revoked. User remains an admin.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
