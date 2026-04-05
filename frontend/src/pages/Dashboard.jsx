import { useState, useEffect, useContext, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks, subDays } from 'date-fns';
import api from '../api';
import SadhanaCard from '../components/SadhanaCard';
import LoadingSpinner from '../components/LoadingSpinner';
import DailyQuote from '../components/DailyQuote';
import { ChevronLeft, ChevronRight, CheckCircle, Flame, Star, Sun, BookOpen, HandHeart } from 'lucide-react';
import clsx from 'clsx';
import AuthContext from '../context/AuthContext';
import { calculateDailyScore, calculateWeeklyStats, getBadges, calculateStreak } from '../utils/scoring';

// ─── Motivation Banner ────────────────────────────────────────────────────────
const MotivationBanner = ({ score }) => {
    if (score === null || score === undefined) return null;

    let bg, border, icon, title, text;
    if (score < 50) {
        bg = 'bg-red-50'; border = 'border-red-200';
        icon = '⚠️'; title = 'Attention Needed!';
        text = `Your sadhana score last week was ${score}%. Connect with your counselor for inspiration!`;
    } else if (score >= 80) {
        bg = 'bg-green-50'; border = 'border-green-200';
        icon = '⭐'; title = 'Wonderful Sadhana!';
        text = `Your sadhana score last week was an amazing ${score}%. Keep up the enthusiasm!`;
    } else {
        bg = 'bg-blue-50'; border = 'border-blue-200';
        icon = '🙏'; title = 'Steady Progress';
        text = `Your sadhana score last week was ${score}%. Let's try to improve our offering this week.`;
    }

    return (
        <div className={`${bg} border ${border} rounded-2xl p-4 shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{icon}</span>
                <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
            </div>
            <p className="text-gray-600 text-sm">{text}</p>
        </div>
    );
};

// ─── Badge chip ───────────────────────────────────────────────────────────────
const BadgeChip = ({ badge }) => (
    <span
        title={badge.title}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold
                   bg-amber-50 text-amber-700 border border-amber-200 shadow-sm"
    >
        {badge.label}
    </span>
);

// ─── Progress Bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ label, value, max, unit, percent }) => {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : (percent ?? 0);
    const color = pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400';
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-gray-600">
                <span>{label} ({value}{unit} / {max}{unit})</span>
                <span>{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user } = useContext(AuthContext);

    const isExcluded = user?.role === 'owner' || ['brahmacari', 'other', 'yudhisthir'].includes(user?.group_name);
    if (isExcluded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="bg-white rounded-2xl shadow-md border border-amber-100 p-10 text-center max-w-md">
                    <div className="text-6xl mb-4">{user?.role === 'owner' ? '👑' : '🕉️'}</div>
                    <h2 className="text-2xl font-bold text-amber-800 font-serif mb-2">
                        {user?.role === 'owner' ? 'Owner' : 'Brahmacari'}
                    </h2>
                    <p className="text-gray-500 text-sm mb-4">Administrative Role — Sadhana entry is not required for your account.</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4">
                        <p className="text-amber-700 text-sm font-medium">
                            {user?.role === 'owner'
                                ? 'You have full access to manage all devotees and their data.'
                                : 'You have access to the Admin Panel to assist in managing devotee data.'}
                        </p>
                    </div>
                </div>
                <DailyQuote />
            </div>
        );
    }

    const yesterday = subDays(new Date(), 1);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(yesterday));
    const [selectedDate, setSelectedDate]         = useState(yesterday);
    const [weeklyLogs, setWeeklyLogs]             = useState([]);
    const [allLogs, setAllLogs]                   = useState([]);       // for badges + streak
    const [stats, setStats]                       = useState(null);
    const [loading, setLoading]                   = useState(true);

    const fetchWeeklyLogs = async () => {
        try {
            setLoading(true);
            const start = format(currentWeekStart, 'yyyy-MM-dd');
            const end   = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
            const { data } = await api.get(`/sadhana/weekly?startDate=${start}&endDate=${end}`);
            setWeeklyLogs(data);
        } catch (err) {
            console.error('Failed to fetch weekly logs', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/sadhana/stats');
            setStats(data);
        } catch (err) {
            console.warn('Stats unavailable:', err);
            setStats(null);
        }
    };

    const fetchAllLogs = async () => {
        try {
            const { data } = await api.get('/sadhana/history');
            setAllLogs(data);
        } catch (err) {
            console.warn('History unavailable:', err);
        }
    };

    useEffect(() => {
        fetchWeeklyLogs();
        fetchStats();
        fetchAllLogs();
    }, [currentWeekStart]);

    // ── Computed values ────────────────────────────────────────────────────────
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    const getLogForDate = (date) => {
        if (!weeklyLogs || !Array.isArray(weeklyLogs)) return null;
        const dateStr = format(date, 'yyyy-MM-dd');
        return weeklyLogs.find(log => {
            if (!log.date) return false;
            // UTC-safe: prevents IST (+5:30) shifting "2026-04-04T00:00:00Z" → April 3 locally
            const raw = log.date;
            const logDate = typeof raw === 'string'
                ? raw.slice(0, 10)
                : `${raw.getUTCFullYear()}-${String(raw.getUTCMonth()+1).padStart(2,'0')}-${String(raw.getUTCDate()).padStart(2,'0')}`;
            return logDate === dateStr;
        });
    };

    const selectedLog  = getLogForDate(selectedDate);
    const activeScore  = useMemo(
        () => selectedLog && stats?.quota ? calculateDailyScore(selectedLog, stats.quota) : { bodyScore: 0, soulScore: 0 },
        [selectedLog, stats]
    );

    // Weekly stats (6-metric progress bars) — computed from backend weeklyTotals
    const weeklyStats = useMemo(() => {
        if (!stats?.quota || !stats?.weeklyTotals) return null;
        const { weeklyTotals: wt, quota } = stats;
        const wakeT  = quota.wake_target  || '05:00';
        const sleepT = quota.sleep_target || '22:00';
        return {
            reading:  { value: wt.reading,      max: (quota.read_target || 0) * 7, unit: 'm' },
            hearing:  { value: wt.hearing,       max: (quota.hear_target || 0) * 7, unit: 'm' },
            wake:     { value: wt.wakeUpOnTime,  max: 7, unit: ' days', label: `Wake ≤ ${wakeT}` },
            japa:     { value: wt.japaOnTime,    max: 7, unit: ' days', label: 'Japa before 10 AM' },
            rest:     { value: wt.restOnTime,    max: 7, unit: ' days', label: 'Day Rest ≤ 30 mins' },
            sleep:    { value: wt.sleepOnTime,   max: 7, unit: ' days', label: `Sleep ≤ ${sleepT}` },
            nrcm:     { value: wt.nrcm,          max: (quota.nrcm_target || 1) * 7, unit: ' pts' },
        };
    }, [stats]);

    // Badges computed from all history logs
    const badges  = useMemo(() => getBadges(allLogs), [allLogs]);
    const streak  = useMemo(() => stats?.streak ?? calculateStreak(allLogs), [stats, allLogs]);

    const isCurrentWeek = isSameDay(startOfWeek(yesterday), currentWeekStart);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-5">

            {/* ── Ashram Broadcast ─────────────────────────────────────────── */}
            {stats?.broadcast && (
                <div className="bg-white border-2 border-saffron-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center space-x-2 text-saffron-700 font-bold mb-1">
                        <span className="text-lg">📢</span>
                        <h3 className="uppercase tracking-wider text-xs">Ashram Broadcast</h3>
                    </div>
                    <p className="text-gray-700 font-medium italic text-center py-2">
                        "{stats.broadcast}"
                    </p>
                </div>
            )}

            {/* ── Motivation Banner (previous week score) ───────────────────── */}
            <MotivationBanner score={stats?.prevWeekAvgScore} />

            {/* ── Streak + Badges row ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Streak */}
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                        <Flame size={16} className="text-red-500" />
                        <span className="text-sm font-bold text-red-600">{streak} Day{streak !== 1 ? 's' : ''} Streak</span>
                    </div>
                    {/* Badges */}
                    {badges.map(b => <BadgeChip key={b.key} badge={b} />)}
                    {badges.length === 0 && streak === 0 && (
                        <span className="text-xs text-gray-400 italic">Complete your sadhana daily to earn badges!</span>
                    )}
                </div>
            </div>

            {/* ── Body / Soul Scores ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            <span className="mr-2 text-blue-500">🧘</span> Body Score
                        </h3>
                        <span className="text-2xl font-black text-blue-600">{activeScore.bodyScore}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                            className="bg-blue-500 h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${activeScore.bodyScore}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-tighter">
                        Avg of Wake · Rest · Sleep  ±5 on-time
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            <span className="mr-2 text-orange-500">🪷</span> Soul Score
                        </h3>
                        <span className="text-2xl font-black text-orange-600">{activeScore.soulScore}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                            className="bg-orange-500 h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${activeScore.soulScore}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-tighter">
                        Avg of Japa · Reading · Hearing · NRCM
                    </p>
                </div>
            </div>

            {/* ── Weekly Quota Progress (6 bars) ────────────────────────────── */}
            {weeklyStats && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-5 flex items-center">
                        <span className="mr-2 text-saffron-600">📈</span> Weekly Quota Progress
                    </h3>
                    <div className="space-y-4">
                        <ProgressBar label="Reading"            value={weeklyStats.reading.value} max={weeklyStats.reading.max}  unit="m" />
                        <ProgressBar label="Hearing"            value={weeklyStats.hearing.value} max={weeklyStats.hearing.max}  unit="m" />
                        <ProgressBar label={weeklyStats.wake.label}  value={weeklyStats.wake.value}  max={7} unit=" days" />
                        <ProgressBar label={weeklyStats.japa.label}  value={weeklyStats.japa.value}  max={7} unit=" days" />
                        <ProgressBar label={weeklyStats.rest.label}  value={weeklyStats.rest.value}  max={7} unit=" days" />
                        <ProgressBar label={weeklyStats.sleep.label} value={weeklyStats.sleep.value} max={7} unit=" days" />
                        <ProgressBar label="NRCM Progress"      value={weeklyStats.nrcm.value}  max={weeklyStats.nrcm.max}  unit=" pts" />
                    </div>
                </div>
            )}

            {/* ── Week Navigator ─────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <button
                        onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                        aria-label="Previous Week"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 font-serif">Hare Krishna</h2>
                        <p className="text-xs text-gray-500 font-medium">
                            {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
                        </p>
                    </div>
                    {isCurrentWeek ? (
                        <span className="bg-saffron-100 text-saffron-700 text-xs px-2 py-1 rounded-full font-medium">
                            Current Week
                        </span>
                    ) : (
                        <button
                            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                            aria-label="Next Week"
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Day Picker ────────────────────────────────────────────────── */}
            <div className="flex overflow-x-auto pb-2 gap-2 md:grid md:grid-cols-7 md:gap-4 scrollbar-hide">
                {weekDays.map((day) => {
                    const log        = getLogForDate(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday    = isSameDay(day, new Date());
                    const isFuture   = day >= new Date().setHours(0, 0, 0, 0);

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => setSelectedDate(day)}
                            disabled={isFuture}
                            className={clsx(
                                'flex flex-col items-center justify-center p-2 md:p-3 rounded-lg min-w-[50px] md:min-w-[60px] flex-shrink-0 transition-all border',
                                isSelected
                                    ? 'bg-saffron-600 text-white border-saffron-600 shadow-md transform scale-105'
                                    : isFuture
                                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-saffron-300 hover:bg-saffron-50',
                                isToday && !isSelected && 'ring-2 ring-saffron-400 ring-offset-2 opacity-40'
                            )}
                        >
                            <span className="text-[10px] md:text-xs font-medium uppercase">{format(day, 'EEE')}</span>
                            <span className="text-base md:text-lg font-bold mt-0.5 md:mt-1">{format(day, 'd')}</span>
                            <div className="mt-1 md:mt-2 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full">
                                {log ? (
                                    <div className={clsx('h-1.5 w-1.5 md:h-2 md:w-2 rounded-full', isSelected ? 'bg-white' : 'bg-green-500')} />
                                ) : !isFuture && (
                                    <div className={clsx('h-1.5 w-1.5 md:h-2 md:w-2 rounded-full', isSelected ? 'bg-saffron-800' : 'bg-gray-200')} />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ── Sadhana Form ─────────────────────────────────────────────── */}
            <div className="mt-4">
                <SadhanaCard
                    date={selectedDate}
                    existingData={getLogForDate(selectedDate)}
                    onSave={() => { fetchWeeklyLogs(); fetchStats(); fetchAllLogs(); }}
                    isReadOnly={selectedDate >= new Date().setHours(0, 0, 0, 0)}
                />
            </div>
        </div>
    );
};

export default Dashboard;
