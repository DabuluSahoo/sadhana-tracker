/**
 * scoring.js
 * Utility to calculate Body and Soul percentages based on daily sadhana logs and group quotas.
 */

const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

/**
 * Calculates scores for a single day's log
 * @param {Object} log - The sadhana log entry
 * @param {Object} quota - The quota for the user's group
 * @returns {Object} { bodyScore, soulScore }
 */
exports.calculateDailyScore = (log, quota) => {
    if (!log || !quota) return { bodyScore: 0, soulScore: 0 };

    // --- Body Score (Physical Discipline) ---
    // Targets: Wake Time, Sleep Time, Day Rest
    let bodyPoints = 0;
    let bodyWeight = 0;

    // 1. Wake Up Time (Weight: 50)
    if (log.wakeup_time && quota.wake_target) {
        bodyWeight += 50;
        const actual = parseTime(log.wakeup_time);
        const target = parseTime(quota.wake_target);
        if (actual <= target) {
            bodyPoints += 50;
        } else {
            // Deduct 10 points for every 30 mins late, min 0
            const lateMins = actual - target;
            const penalty = Math.floor(lateMins / 30) * 10;
            bodyPoints += Math.max(0, 50 - penalty);
        }
    }

    // 2. Sleep Time (Weight: 25)
    if (log.sleep_time && quota.sleep_target) {
        bodyWeight += 25;
        const actual = parseTime(log.sleep_time);
        const target = parseTime(quota.sleep_target);
        // Note: Sleep target is usually "latest allowed". Handle midnight wrapping.
        // Assuming simple comparison for now.
        if (actual <= target || actual >= 1320) { // 22:00 = 1320
            bodyPoints += 25;
        } else {
             bodyPoints += 0;
        }
    }

    // 3. Day Rest (Weight: 25)
    // Assuming a default limit if not in quota, or just reward if 0
    bodyWeight += 25;
    if ((log.dayrest_time || 0) <= 60) { // 1 hour limit
        bodyPoints += 25;
    }

    const bodyScore = bodyWeight > 0 ? Math.round((bodyPoints / bodyWeight) * 100) : 0;

    // --- Soul Score (Spiritual Diet) ---
    // Targets: Rounds (Fixed 16), Reading (Quota), Hearing (Quota)
    let soulPoints = 0;
    let soulWeight = 0;

    // 1. Rounds (Weight: 40)
    soulWeight += 40;
    const roundsScore = Math.min(100, ((log.rounds || 0) / 16) * 100);
    soulPoints += (roundsScore * 0.4);

    // 2. Reading (Weight: 30)
    if (quota.read_target > 0) {
        soulWeight += 30;
        const readScore = Math.min(100, ((log.reading_time || 0) / quota.read_target) * 100);
        soulPoints += (readScore * 0.3);
    } else {
        // If no target, give free points if they did anything? No, just keep weight 0.
    }

    // 3. Hearing (Weight: 30)
    if (quota.hear_target > 0) {
        soulWeight += 30;
        const hearScore = Math.min(100, ((log.hearing_time || 0) / quota.hear_target) * 100);
        soulPoints += (hearScore * 0.3);
    }

    const soulScore = soulWeight > 0 ? Math.round(soulPoints) : 0;

    return { 
        bodyScore: Math.min(100, bodyScore), 
        soulScore: Math.min(100, soulScore) 
    };
};
