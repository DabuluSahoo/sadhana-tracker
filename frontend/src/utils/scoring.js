/**
 * scoring.js
 * Matches the VOICE Sadhana Tracker HTML logic EXACTLY.
 *
 * Body Score = avg(Wake %, Rest %, Sleep %)   ← 3-part triad
 * Soul Score = avg(Japa %, Read %, Hear %)    ← 3-part triad
 */

const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 60 + parts[1];
};

/** Mirrors HTML getSleepMins: times before noon treated as next-day (after midnight) */
const getSleepMins = (timeStr) => {
    if (!timeStr) return 9999;
    const [h, m] = timeStr.split(':').map(Number);
    const adjusted = h < 12 ? h + 24 : h;
    return adjusted * 60 + m;
};

/**
 * Calculates Body & Soul scores for a SINGLE day's log.
 * Used by Dashboard.jsx when user selects a date.
 * @param {Object} log   - daily_sadhana row
 * @param {Object} quota - group_quotas row  { read_target, hear_target, wake_target, sleep_target }
 * @returns {{ bodyScore: number, soulScore: number }}
 */
export const calculateDailyScore = (log, quota) => {
    if (!log || !quota) return { bodyScore: 0, soulScore: 0 };

    // --- Body Score ---
    let pWake = 0, pRest = 0, pSleep = 0;

    if (log.wakeup_time && quota.wake_target && log.wakeup_time <= quota.wake_target) pWake = 100;
    if ((parseInt(log.dayrest_time) || 0) <= 30) pRest = 100;

    if (log.sleep_time && quota.sleep_target) {
        if (getSleepMins(log.sleep_time) <= getSleepMins(quota.sleep_target)) pSleep = 100;
    }

    const bodyScore = Math.round((pWake + pRest + pSleep) / 3);

    // --- Soul Score ---
    let pJapa = 0, pRead = 0, pHear = 0;

    // Japa before 10 AM
    if ((log.japa_completed_time || '23:59') <= '10:00') pJapa = 100;

    pRead = quota.read_target > 0
        ? Math.min(100, Math.round(((parseInt(log.reading_time) || 0) / quota.read_target) * 100))
        : 100;

    pHear = quota.hear_target > 0
        ? Math.min(100, Math.round(((parseInt(log.hearing_time) || 0) / quota.hear_target) * 100))
        : 100;

    const soulScore = Math.round((pJapa + pRead + pHear) / 3);

    return {
        bodyScore: Math.min(100, bodyScore),
        soulScore: Math.min(100, soulScore),
    };
};

/**
 * Calculates Body & Soul scores for a SET of logs over a timeframe (e.g. a week).
 * Matches HTML getStatsForTimeframe() exactly.
 * Returns null if quota is not applicable (1st Year equivalent → no quota set).
 *
 * @param {Array}  logs  - array of daily_sadhana rows
 * @param {Object} quota - group_quotas row
 * @returns {{ Body, Soul, Wake, Rest, Sleep, Japa, Read, Hear, rawTotals, targets } | null}
 */
export const calculateWeeklyStats = (logs, quota) => {
    if (!logs || !quota) return null;

    const readQ  = (quota.read_target  || 0) * 7;
    const hearQ  = (quota.hear_target  || 0) * 7;
    const wakeT  = quota.wake_target  || '05:00';
    const sleepT = quota.sleep_target || '22:00';

    const totals = { read: 0, hear: 0, wakeDays: 0, japaDays: 0, restDays: 0, sleepDays: 0, daysLogged: logs.length };

    logs.forEach(r => {
        totals.read  += parseInt(r.reading_time)  || 0;
        totals.hear  += parseInt(r.hearing_time)  || 0;
        if ((r.wakeup_time || '23:59') <= wakeT) totals.wakeDays++;
        if ((r.japa_completed_time || '23:59') <= '10:00') totals.japaDays++;
        if ((parseInt(r.dayrest_time) || 0) <= 30) totals.restDays++;
        if (getSleepMins(r.sleep_time) <= getSleepMins(sleepT)) totals.sleepDays++;
    });

    const days = 7; // always measure against 7-day week target
    const pRead  = readQ > 0 ? Math.min(100, Math.round((totals.read  / readQ) * 100)) : 0;
    const pHear  = hearQ > 0 ? Math.min(100, Math.round((totals.hear  / hearQ) * 100)) : 0;
    const pWake  = Math.round((totals.wakeDays  / days) * 100);
    const pJapa  = Math.round((totals.japaDays  / days) * 100);
    const pRest  = Math.round((totals.restDays  / days) * 100);
    const pSleep = Math.round((totals.sleepDays / days) * 100);

    return {
        Read:  pRead,
        Hear:  pHear,
        Wake:  pWake,
        Japa:  pJapa,
        Rest:  pRest,
        Sleep: pSleep,
        Body:  Math.round((pWake + pRest + pSleep) / 3),
        Soul:  Math.round((pJapa + pRead + pHear)  / 3),
        rawTotals: totals,
        targets: { readQ, hearQ },
    };
};

/**
 * Calculate consecutive-day streak from an array of log rows.
 * Matches HTML calculateStreak() logic.
 * @param {Array} logs - array with .date fields (ISO string or 'YYYY-MM-DD')
 */
export const calculateStreak = (logs) => {
    if (!logs || logs.length === 0) return 0;

    const uniqueDays = [...new Set(
        logs.map(r => {
            const d = new Date(r.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        })
    )].sort((a, b) => b - a);

    const today     = new Date(); today.setHours(0, 0, 0, 0); const todayTs = today.getTime();
    const yesterday = todayTs - 86400000;

    // Streak must start from today or yesterday
    if (uniqueDays[0] !== todayTs && uniqueDays[0] !== yesterday) return 0;

    let streak = 0;
    let expected = uniqueDays[0];
    for (const ts of uniqueDays) {
        if (ts === expected) { streak++; expected -= 86400000; }
        else break;
    }
    return streak;
};

/**
 * Compute gamification badges from all user logs.
 * Matches HTML getBadges() logic.
 * @param {Array} logs
 * @returns {Array<string>} badge label strings
 */
export const getBadges = (logs) => {
    if (!logs || logs.length === 0) return [];

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const last7Ms  = today.getTime() - 7 * 86400000;
    const last7    = logs.filter(r => new Date(r.date).getTime() >= last7Ms);

    let earlyRiserDays = 0, scholarDays = 0, totalSevaMins = 0;
    last7.forEach(r => {
        if (r.wakeup_time && r.wakeup_time <= '04:30') earlyRiserDays++;
        if ((parseInt(r.reading_time) || 0) >= 30) scholarDays++;
        // service_hours stored as hours in new app → convert to mins
        totalSevaMins += (parseFloat(r.service_hours) || 0) * 60;
    });

    const badges = [];
    if (earlyRiserDays >= 5)  badges.push({ key: 'early_riser',  label: '🌅 Early Riser',     title: 'Woke up early most of the week' });
    if (scholarDays   >= 5)   badges.push({ key: 'scholar',      label: '📖 Scholar',          title: 'Read 30+ mins consistently' });
    if (totalSevaMins >= 120) badges.push({ key: 'seva_warrior', label: '🙏 Seva Warrior',     title: '120+ mins of Seva this week' });

    const streak = calculateStreak(logs);
    if (streak >= 7) badges.push({ key: 'unbroken', label: '🔥 1 Week Unbroken', title: '7+ day streak' });

    return badges;
};
