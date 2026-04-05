/**
 * scoring.js
 *
 * Body Score = avg(Wake %, Rest %, Sleep %, Study %) + filled-on-time bonus/penalty
 * Soul Score = avg(Japa %, Read %, Hear %, NRCM %)
 *
 * "Filled on time" = log was submitted (created_at) on the same day as the log date.
 *   → +5 bonus points to Body if on time
 *   → -5 penalty points to Body if submitted late (different day)
 *   Score is clamped to [0, 100].
 */

const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 60 + parts[1];
};

/** Times before noon treated as next-day (after midnight) for sleep */
const getSleepMins = (timeStr) => {
    if (!timeStr) return 9999;
    const [h, m] = timeStr.split(':').map(Number);
    const adjusted = h < 12 ? h + 24 : h;
    return adjusted * 60 + m;
};

/** Returns true if the log was filled on the same calendar day it covers */
const isFilledOnTime = (log) => {
    if (!log.created_at || !log.date) return false;
    const logDate      = log.date.toString().slice(0, 10);          // 'YYYY-MM-DD'
    const submittedDate = new Date(log.created_at)
        .toLocaleDateString('en-CA');                                // 'YYYY-MM-DD'
    return logDate === submittedDate;
};

/**
 * Calculates Body & Soul scores for a SINGLE day's log.
 *
 * @param {Object} log   - daily_sadhana row
 * @param {Object} quota - group_quotas row
 * @returns {{ bodyScore, soulScore }}
 */
export const calculateDailyScore = (log, quota) => {
    if (!log || !quota) return { bodyScore: 0, soulScore: 0 };

    // ── Body Score: Wake, Rest, Sleep (each 0 or 100) ± on-time bonus ─────────
    let pWake = 0, pRest = 0, pSleep = 0;

    if (log.wakeup_time && quota.wake_target && log.wakeup_time <= quota.wake_target)
        pWake = 100;

    if ((parseInt(log.dayrest_time) || 0) <= 30)
        pRest = 100;

    if (log.sleep_time && quota.sleep_target &&
        getSleepMins(log.sleep_time) <= getSleepMins(quota.sleep_target))
        pSleep = 100;

    const baseBody  = Math.round((pWake + pRest + pSleep) / 3);
    const timeBonusBefore = isFilledOnTime(log) ? 5 : -5;
    const bodyScore = Math.min(100, Math.max(0, baseBody + timeBonusBefore));

    // ── Soul Score: Japa, Read, Hear, NRCM ───────────────────────────────────
    let pJapa = 0, pRead = 0, pHear = 0, pNrcm = 0;

    // Japa before 10 AM
    if ((log.japa_completed_time || '23:59') <= '10:00') pJapa = 100;

    pRead = quota.read_target > 0
        ? Math.min(100, Math.round(((parseInt(log.reading_time) || 0) / quota.read_target) * 100))
        : 100;

    pHear = quota.hear_target > 0
        ? Math.min(100, Math.round(((parseInt(log.hearing_time) || 0) / quota.hear_target) * 100))
        : 100;

    // NRCM: stored as integer (number of rounds / count). Treat > 0 as 100% for now.
    // If a nrcm_target exists on quota use it, otherwise presence = full marks.
    const nrcmTarget = quota.nrcm_target || 1;
    const nrcmVal    = parseInt(log.nrcm) || 0;
    pNrcm = nrcmTarget > 0
        ? Math.min(100, Math.round((nrcmVal / nrcmTarget) * 100))
        : (nrcmVal > 0 ? 100 : 0);

    const soulScore = Math.min(100, Math.round((pJapa + pRead + pHear + pNrcm) / 4));

    return { bodyScore, soulScore };
};

/**
 * Calculates weekly aggregate Body & Soul scores for a set of logs.
 *
 * @param {Array}  logs  - array of daily_sadhana rows
 * @param {Object} quota - group_quotas row
 * @returns {{ Body, Soul, Wake, Rest, Sleep, Study, Japa, Read, Hear, Nrcm, rawTotals, targets } | null}
 */
export const calculateWeeklyStats = (logs, quota) => {
    if (!logs || !quota) return null;

    const readQ       = (quota.read_target  || 0) * 7;
    const hearQ       = (quota.hear_target  || 0) * 7;
    const nrcmTarget  = quota.nrcm_target || 1;
    const wakeT       = quota.wake_target  || '05:00';
    const sleepT      = quota.sleep_target || '22:00';

    const totals = {
        read: 0, hear: 0, nrcm: 0,
        wakeDays: 0, japaDays: 0, restDays: 0, sleepDays: 0, onTimeDays: 0,
        daysLogged: logs.length,
    };

    logs.forEach(r => {
        totals.read  += parseInt(r.reading_time) || 0;
        totals.hear  += parseInt(r.hearing_time) || 0;
        totals.nrcm  += parseInt(r.nrcm)         || 0;
        if ((r.wakeup_time || '23:59') <= wakeT)                           totals.wakeDays++;
        if ((r.japa_completed_time || '23:59') <= '10:00')                 totals.japaDays++;
        if ((parseInt(r.dayrest_time) || 0) <= 30)                         totals.restDays++;
        if (getSleepMins(r.sleep_time) <= getSleepMins(sleepT))            totals.sleepDays++;
        if (isFilledOnTime(r))                                             totals.onTimeDays++;
    });

    const days  = 7;
    const pRead  = readQ > 0 ? Math.min(100, Math.round((totals.read / readQ) * 100)) : 0;
    const pHear  = hearQ > 0 ? Math.min(100, Math.round((totals.hear / hearQ) * 100)) : 0;
    const pNrcm  = nrcmTarget > 0 ? Math.min(100, Math.round((totals.nrcm / (nrcmTarget * days)) * 100)) : 0;
    const pWake  = Math.round((totals.wakeDays  / days) * 100);
    const pJapa  = Math.round((totals.japaDays  / days) * 100);
    const pRest  = Math.round((totals.restDays  / days) * 100);
    const pSleep = Math.round((totals.sleepDays / days) * 100);

    // Body = avg(Wake, Rest, Sleep) ± on-time bonus
    const baseBody  = Math.round((pWake + pRest + pSleep) / 3);
    const onTimePct = Math.round((totals.onTimeDays / days) * 100);
    const timeBonus = onTimePct >= 50 ? 5 : -5;
    const Body  = Math.min(100, Math.max(0, baseBody + timeBonus));

    // Soul = avg(Japa, Read, Hear, NRCM)
    const Soul  = Math.min(100, Math.round((pJapa + pRead + pHear + pNrcm) / 4));

    return {
        Read: pRead, Hear: pHear, Nrcm: pNrcm,
        Wake: pWake, Japa: pJapa, Rest: pRest, Sleep: pSleep,
        OnTime: onTimePct,
        Body, Soul,
        rawTotals: totals,
        targets: { readQ, hearQ },
    };
};

/**
 * Calculate consecutive-day streak.
 * @param {Array} logs - array with .date fields
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
 * Compute gamification badges.
 * @param {Array} logs
 * @returns {Array<{key, label, title}>}
 */
export const getBadges = (logs) => {
    if (!logs || logs.length === 0) return [];

    const today   = new Date(); today.setHours(0, 0, 0, 0);
    const last7Ms = today.getTime() - 7 * 86400000;
    const last7   = logs.filter(r => new Date(r.date).getTime() >= last7Ms);

    let earlyRiserDays = 0, scholarDays = 0, totalSevaMins = 0, onTimeDays = 0;
    last7.forEach(r => {
        if (r.wakeup_time && r.wakeup_time <= '04:30') earlyRiserDays++;
        if ((parseInt(r.reading_time) || 0) >= 30) scholarDays++;
        totalSevaMins += (parseFloat(r.service_hours) || 0) * 60;
        if (isFilledOnTime(r)) onTimeDays++;
    });

    const badges = [];
    if (earlyRiserDays >= 5)  badges.push({ key: 'early_riser',  label: '🌅 Early Riser',     title: 'Woke up early most of the week' });
    if (scholarDays   >= 5)   badges.push({ key: 'scholar',      label: '📖 Scholar',          title: 'Read 30+ mins consistently' });
    if (totalSevaMins >= 120) badges.push({ key: 'seva_warrior', label: '🙏 Seva Warrior',     title: '120+ mins of Seva this week' });
    if (onTimeDays    >= 5)   badges.push({ key: 'punctual',     label: '⏰ Punctual',         title: 'Submitted on time 5+ days this week' });

    const streak = calculateStreak(logs);
    if (streak >= 7) badges.push({ key: 'unbroken', label: '🔥 1 Week Unbroken', title: '7+ day streak' });

    return badges;
};
