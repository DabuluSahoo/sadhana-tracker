const db = require('../config/db');
const { format, subDays } = require('date-fns');

// Helper: converts HH:MM or HH:MM:SS to minutes, treating <12h as next-day (e.g. 00:30 → 24:30)
const getSleepMins = (t) => {
    if (!t) return 9999;
    const [h, m] = t.split(':').map(Number);
    return (h < 12 ? h + 24 : h) * 60 + m;
};

exports.createOrUpdateLog = async (req, res) => {
    const {
        date, rounds, reading_time, hearing_time, study_time, dayrest_time,
        mangala_aarti, wakeup_time, sleep_time, service_hours, comments,
        nrcm, reading_details, hearing_details, japa_completed_time
    } = req.body;
    const userId = req.user.id;

    try {
        const [existing] = await db.query(
            'SELECT * FROM daily_sadhana WHERE user_id = ? AND date = ?',
            [userId, date]
        );

        if (existing.length > 0) {
            await db.query(
                `UPDATE daily_sadhana SET rounds=?, reading_time=?, hearing_time=?, study_time=?,
                 dayrest_time=?, mangala_aarti=?, wakeup_time=?, sleep_time=?, service_hours=?,
                 comments=?, nrcm=?, reading_details=?, hearing_details=?, japa_completed_time=?
                 WHERE id=?`,
                [
                    rounds, reading_time, hearing_time, study_time || 0, dayrest_time || 0,
                    mangala_aarti, wakeup_time, sleep_time, service_hours, comments,
                    nrcm || 0, reading_details || null, hearing_details || null,
                    japa_completed_time || null, existing[0].id
                ]
            );
            return res.json({ message: 'Report updated' });
        } else {
            await db.query(
                `INSERT INTO daily_sadhana
                 (user_id, date, rounds, reading_time, hearing_time, study_time, dayrest_time,
                  mangala_aarti, wakeup_time, sleep_time, service_hours, comments, nrcm,
                  reading_details, hearing_details, japa_completed_time)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, date, rounds, reading_time, hearing_time,
                    study_time || 0, dayrest_time || 0, mangala_aarti, wakeup_time,
                    sleep_time, service_hours, comments, nrcm || 0,
                    reading_details || null, hearing_details || null, japa_completed_time || null
                ]
            );
            return res.status(201).json({ message: 'Report submitted' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getWeeklyLogs = async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    try {
        const [logs] = await db.query(
            'SELECT * FROM daily_sadhana WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC',
            [userId, startDate, endDate]
        );
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const [logs] = await db.query(
            'SELECT * FROM daily_sadhana WHERE user_id = ? ORDER BY date DESC LIMIT 30',
            [userId]
        );
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getTrends = async (req, res) => {
    const userId = req.user.id;
    try {
        const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        const [logs] = await db.query(
            'SELECT date, rounds, reading_time, hearing_time, service_hours, dayrest_time FROM daily_sadhana WHERE user_id = ? AND date >= ? ORDER BY date ASC',
            [userId, thirtyDaysAgo]
        );
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
        let groupClause = '';
        const params = [startDate, endDate];

        if (group && group !== 'all') {
            groupClause = 'AND u.group_name = ?';
            params.push(group);
        } else if (req.user.role !== 'owner' && req.user.group_name !== 'brahmacari') {
            let perms = req.user.group_permissions;
            if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch { perms = []; } }
            if (!Array.isArray(perms) || perms.length === 0) return res.status(403).json({ message: 'No group permissions' });
            groupClause = `AND u.group_name IN (${perms.map(() => '?').join(',')})`;
            params.push(...perms);
        }

        const ownerClause = req.user.role !== 'owner' ? 'AND u.role != "owner"' : '';

        const [rows] = await db.query(
            `SELECT u.id AS user_id, u.username, u.group_name,
                    ds.date, ds.rounds, ds.reading_time, ds.hearing_time,
                    ds.study_time, ds.service_hours, ds.mangala_aarti,
                    ds.wakeup_time, ds.sleep_time, ds.comments,
                    ds.nrcm, ds.reading_details, ds.hearing_details, ds.japa_completed_time,
                    ds.dayrest_time
             FROM users u
             LEFT JOIN daily_sadhana ds ON ds.user_id = u.id AND ds.date BETWEEN ? AND ?
             WHERE u.role != 'owner' AND (u.group_name IS NULL OR u.group_name != 'brahmacari')
             ${groupClause} ${ownerClause}
             ORDER BY u.group_name, u.username, ds.date ASC`,
            params
        );

        const usersMap = {};
        for (const row of rows) {
            if (!usersMap[row.user_id]) {
                usersMap[row.user_id] = {
                    user_id: row.user_id,
                    username: row.username,
                    group_name: row.group_name,
                    logs: []
                };
            }
            if (row.date) usersMap[row.user_id].logs.push(row);
        }

        res.json(Object.values(usersMap));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    const userId = req.user.id;
    const groupName = req.user.group_name;

    try {
        // 1. Get Broadcast
        const [broadcastRows] = await db.query(
            'SELECT value_text FROM admin_settings WHERE key_name = "global_broadcast"'
        );
        const broadcast = broadcastRows[0]?.value_text || '';

        // 2. Get Quota for user's group
        const [quotaRows] = await db.query(
            'SELECT * FROM group_quotas WHERE group_name = ?',
            [groupName]
        );
        const quota = quotaRows[0] || {
            read_target: 0, hear_target: 0,
            wake_target: '05:00:00', sleep_target: '22:00:00'
        };

        const wakeT  = quota.wake_target  || '05:00';
        const sleepT = quota.sleep_target || '22:00';

        // 3. Current week logs (last 7 days)
        const todayStr        = format(new Date(), 'yyyy-MM-dd');
        const sevenDaysAgoStr = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        const [logs] = await db.query(
            'SELECT * FROM daily_sadhana WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
            [userId, sevenDaysAgoStr, todayStr]
        );

        // 4. Previous week logs (for motivation banner)
        const fourteenDaysAgoStr = format(subDays(new Date(), 14), 'yyyy-MM-dd');
        const [prevLogs] = await db.query(
            'SELECT * FROM daily_sadhana WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
            [userId, fourteenDaysAgoStr, sevenDaysAgoStr]
        );

        // 5. All recent logs for streak (last 60 days)
        const sixtyDaysAgoStr = format(subDays(new Date(), 60), 'yyyy-MM-dd');
        const [allLogs] = await db.query(
            'SELECT date FROM daily_sadhana WHERE user_id = ? AND date >= ? ORDER BY date DESC',
            [userId, sixtyDaysAgoStr]
        );

        // 6. Calculate consecutive streak
        const uniqueDays = [...new Set(
            allLogs.map(r => {
                const d = new Date(r.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime();
            })
        )].sort((a, b) => b - a);

        const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
        const todayTs     = todayD.getTime();
        const yesterdayTs = todayTs - 86400000;

        let streak = 0;
        if (uniqueDays.length > 0 && (uniqueDays[0] === todayTs || uniqueDays[0] === yesterdayTs)) {
            let expected = uniqueDays[0];
            for (const ts of uniqueDays) {
                if (ts === expected) { streak++; expected -= 86400000; } else break;
            }
        }

        // 7. Full 6-metric weekly totals (matches HTML getStatsForTimeframe)
        const weeklyTotals = logs.reduce((acc, log) => {
            acc.rounds   += (log.rounds || 0);
            acc.reading  += (log.reading_time || 0);
            acc.hearing  += (log.hearing_time || 0);
            acc.service  += (parseFloat(log.service_hours) || 0);
            if ((log.wakeup_time || '23:59') <= wakeT)                       acc.wakeUpOnTime++;
            if ((log.japa_completed_time || '23:59') <= '10:00')             acc.japaOnTime++;
            if ((parseInt(log.dayrest_time) || 0) <= 30)                     acc.restOnTime++;
            if (getSleepMins(log.sleep_time) <= getSleepMins(sleepT))        acc.sleepOnTime++;
            return acc;
        }, { rounds: 0, reading: 0, hearing: 0, service: 0, wakeUpOnTime: 0, japaOnTime: 0, restOnTime: 0, sleepOnTime: 0 });

        // 8. Previous week avg score for motivation banner
        let prevWeekAvgScore = null;
        if (prevLogs.length > 0 && (quota.read_target > 0 || quota.hear_target > 0)) {
            const readQ = (quota.read_target || 0) * 7;
            const hearQ = (quota.hear_target || 0) * 7;
            const totalRead = prevLogs.reduce((s, r) => s + (r.reading_time || 0), 0);
            const totalHear = prevLogs.reduce((s, r) => s + (r.hearing_time || 0), 0);
            const pRead  = readQ > 0 ? Math.min(100, Math.round((totalRead / readQ) * 100)) : 0;
            const pHear  = hearQ > 0 ? Math.min(100, Math.round((totalHear / hearQ) * 100)) : 0;
            const pWake  = Math.round((prevLogs.filter(r => (r.wakeup_time || '23:59') <= wakeT).length / 7) * 100);
            const pJapa  = Math.round((prevLogs.filter(r => (r.japa_completed_time || '23:59') <= '10:00').length / 7) * 100);
            const pRest  = Math.round((prevLogs.filter(r => (parseInt(r.dayrest_time) || 0) <= 30).length / 7) * 100);
            const pSleep = Math.round((prevLogs.filter(r => getSleepMins(r.sleep_time) <= getSleepMins(sleepT)).length / 7) * 100);
            const body   = Math.round((pWake + pRest + pSleep) / 3);
            const soul   = Math.round((pJapa + pRead + pHear) / 3);
            prevWeekAvgScore = Math.round((body + soul) / 2);
        }

        res.json({
            broadcast,
            quota,
            weeklyTotals,
            streak,
            prevWeekAvgScore,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
