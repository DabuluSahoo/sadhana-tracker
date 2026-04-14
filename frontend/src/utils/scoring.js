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

const toMins = (t) => {
    if (!t) return null;
    const parts = String(t).split(':').map(Number);
    return parts[0] * 60 + (parts[1] || 0);
};

export const japaScore = (japa_completed_time) => {
    const m = toMins(japa_completed_time);
    if (m === null) return null;
    if (m <= toMins('06:45')) return 25;
    if (m <= toMins('09:00')) return 20;
    if (m <= toMins('12:00')) return 15;
    if (m <= toMins('15:00')) return 10;
    if (m <= toMins('18:00')) return 5;
    if (m <= toMins('21:00')) return 0;
    return -5;
};

export const wakeScore = (wakeup_time) => {
    const m = toMins(wakeup_time);
    if (m === null) return null;
    if (m <= toMins('03:45')) return 25;
    if (m <= toMins('03:50')) return 20;
    if (m <= toMins('03:55')) return 15;
    if (m <= toMins('04:00')) return 10;
    if (m <= toMins('04:05')) return 5;
    if (m <= toMins('04:10')) return 0;
    return -5;
};

export const restScore = (dayrest_time) => {
    const mins = parseInt(dayrest_time);
    if (isNaN(mins) || dayrest_time === null || dayrest_time === undefined || dayrest_time === '') return null;
    if (mins <= 30) return 25;
    if (mins <= 45) return 20;
    if (mins <= 60) return 15;
    if (mins <= 75) return 10;
    if (mins <= 90) return 5;
    return -5;
};

export const sleepScore = (sleep_time) => {
    if (!sleep_time) return null;
    let m = toMins(sleep_time);
    const h = parseInt(String(sleep_time).split(':')[0]);
    if (h < 12) m += 24 * 60;
    const thresh = (hh, mm) => hh * 60 + mm;
    if (m <= thresh(21, 30)) return 25;
    if (m <= thresh(21, 40)) return 20;
    if (m <= thresh(21, 45)) return 15;
    if (m <= thresh(21, 50)) return 10;
    if (m <= thresh(21, 55)) return 5;
    if (m <= thresh(22, 0))  return 0;
    return -5;
};

export const fillingScore = (log) => {
    if (!log.created_at || !log.date) return -5;
    const logDate = new Date(log.date);
    const deadline = new Date(logDate);
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(9, 0, 0, 0); // Deadline: 9:00 AM of the next day
    const submitted = new Date(log.created_at);
    return submitted <= deadline ? 5 : -5;
};

/**
 * Calculates Body & Soul scores for a SINGLE day's log.
 */
export const calculateDailyScore = (log, quota) => {
    if (!log || !quota) return { bodyScore: 0, soulScore: 0 };

    const wakeM = wakeScore(log.wakeup_time) ?? 0;
    const pWake = (wakeM / 25) * 100;
    
    const restM = restScore(log.dayrest_time) ?? 0;
    const pRest = (restM / 25) * 100;
    
    const sleepM = sleepScore(log.sleep_time) ?? 0;
    const pSleep = (sleepM / 25) * 100;
    
    const fillM = fillingScore(log);
    const pFill = (fillM / 5) * 100;

    const bodyScore = Math.max(0, Math.min(100, Math.round((pWake + pRest + pSleep + pFill) / 4)));

    const japaM = japaScore(log.japa_completed_time) ?? 0;
    const pJapa = (japaM / 25) * 100;

    const pRead = quota.read_target > 0
        ? Math.min(100, Math.round(((parseInt(log.reading_time) || 0) / quota.read_target) * 100))
        : 100;

    const pHear = quota.hear_target > 0
        ? Math.min(100, Math.round(((parseInt(log.hearing_time) || 0) / quota.hear_target) * 100))
        : 100;

    const nrcmTarget = quota.nrcm_target || 1;
    const nrcmVal    = parseInt(log.nrcm) || 0;
    const pNrcm = nrcmTarget > 0
        ? Math.min(100, Math.round((nrcmVal / nrcmTarget) * 100))
        : (nrcmVal > 0 ? 100 : 0);

    const soulScore = Math.max(0, Math.min(100, Math.round((pJapa + pRead + pHear + pNrcm) / 4)));

    return { bodyScore, soulScore };

};

export const calculateWeeklyStats = (logs, quota) => {
    if (!logs || !quota) return null;

    const readQ       = (quota.read_target  || 30) * 7;
    const hearQ       = (quota.hear_target  || 30) * 7;
    const nrcmTarget  = quota.nrcm_target || 1;

    const totals = {
        read: 0, hear: 0, nrcm: 0,
        japaMarks: 0, wakeMarks: 0, restMarks: 0, sleepMarks: 0, fillMarks: 0,
        daysLogged: logs.length,
    };

    logs.forEach(r => {
        const readVal = parseInt(r.reading_time) || 0;
        const hearVal = parseInt(r.hearing_time) || 0;
        const nrcmVal = parseInt(r.nrcm) || 0;
        
        totals.read  += quota.read_target > 0 ? Math.min(readVal, quota.read_target) : readVal;
        totals.hear  += quota.hear_target > 0 ? Math.min(hearVal, quota.hear_target) : hearVal;
        totals.nrcm  += nrcmTarget > 0 ? Math.min(nrcmVal, nrcmTarget) : nrcmVal;
        
        totals.japaMarks += japaScore(r.japa_completed_time) ?? 0;
        totals.wakeMarks += wakeScore(r.wakeup_time) ?? 0;
        totals.restMarks += restScore(r.dayrest_time) ?? 0;
        totals.sleepMarks += sleepScore(r.sleep_time) ?? 0;
        totals.fillMarks += fillingScore(r);
    });

    const days = 7;
    
    // Soul Averages
    const pJapa  = Math.round((totals.japaMarks / (days * 25)) * 100);
    const pRead  = quota.read_target > 0 ? Math.min(100, Math.round((totals.read / readQ) * 100)) : 0;
    const pHear  = quota.hear_target > 0 ? Math.min(100, Math.round((totals.hear / hearQ) * 100)) : 0;
    const pNrcm  = nrcmTarget > 0 ? Math.min(100, Math.round((totals.nrcm / (nrcmTarget * days)) * 100)) : 0;

    // Body Averages
    const pWake  = Math.round((totals.wakeMarks / (days * 25)) * 100);
    const pRest  = Math.round((totals.restMarks / (days * 25)) * 100);
    const pSleep = Math.round((totals.sleepMarks / (days * 25)) * 100);
    const pFill  = Math.round((totals.fillMarks / 35) * 100);

    // Body = avg(Wake, Rest, Sleep, Filling)
    const Body  = Math.max(0, Math.round((pWake + pRest + pSleep + pFill) / 4));

    // Soul = avg(Japa, Read, Hear, NRCM)
    const Soul  = Math.max(0, Math.round((pJapa + pRead + pHear + pNrcm) / 4));

    return {
        Read: pRead, Hear: pHear, Nrcm: pNrcm,
        Wake: pWake, Japa: pJapa, Rest: pRest, Sleep: pSleep, Fill: pFill,
        OnTime: pFill,
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
        if (fillingScore(r) === 5) onTimeDays++;
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
