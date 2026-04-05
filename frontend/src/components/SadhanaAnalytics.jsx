import { useMemo, useRef, useEffect, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

/** UTC-safe date → 'YYYY-MM-DD' string, avoids IST (+5:30) shifting the date */
const toDateStr = (raw) =>
    typeof raw === 'string' ? raw.slice(0, 10)
    : `${raw.getUTCFullYear()}-${String(raw.getUTCMonth()+1).padStart(2,'0')}-${String(raw.getUTCDate()).padStart(2,'0')}`;

// ─── Dataset toggle config (matches HTML trendChart datasets) ────────────────
const DATASETS = [
    { key: 'reading', label: 'Reading (m)',    color: '#f59e0b', hidden: false },
    { key: 'hearing', label: 'Hearing (m)',    color: '#00b8d4', hidden: true  },
    { key: 'seva',    label: 'Seva (m)',       color: '#22c55e', hidden: true  },
    { key: 'rounds',  label: 'Rounds',         color: '#a78bfa', hidden: true  },
    { key: 'rest',    label: 'Day Rest (m)',   color: '#f43f5e', hidden: true  },
];

const SadhanaAnalytics = ({ logs }) => {
    const japaScrollRef = useRef(null);
    const barScrollRef  = useRef(null);
    const [visible, setVisible] = useState(
        Object.fromEntries(DATASETS.map(d => [d.key, !d.hidden]))
    );

    const toggleDataset = (key) => setVisible(prev => ({ ...prev, [key]: !prev[key] }));

    // ── Trend chart data (30 days) ──────────────────────────────────────────
    const trendData = useMemo(() => {
        if (!logs || logs.length === 0) return [];
        return [...logs]
            .sort((a, b) => toDateStr(a.date).localeCompare(toDateStr(b.date)))
            .slice(-30)
            .map(log => ({
                date:    format(parseISO(toDateStr(log.date)), 'dd/MM'),
                reading: log.reading_time || 0,
                hearing: log.hearing_time || 0,
                seva:    Math.round((parseFloat(log.service_hours) || 0) * 60),
                rounds:  log.rounds || 0,
                rest:    log.dayrest_time || 0,
            }));
    }, [logs]);

    // ── Bar chart data (30 days) ──────────────────────────────────────────────
    const barData = useMemo(() => {
        if (!logs || logs.length === 0) return [];
        return [...logs]
            .sort((a, b) => toDateStr(a.date).localeCompare(toDateStr(b.date)))
            .slice(-30)
            .map(log => ({
                date:    format(parseISO(toDateStr(log.date)), 'MMM d'),
                reading: log.reading_time || 0,
                hearing: log.hearing_time || 0,
                study:   log.study_time || 0,
            }));
    }, [logs]);

    // Auto-scroll BOTH charts to righmost (most recent) on load
    useEffect(() => {
        if (trendData.length > 0 || barData.length > 0) {
            setTimeout(() => {
                if (japaScrollRef.current) japaScrollRef.current.scrollLeft = japaScrollRef.current.scrollWidth;
                if (barScrollRef.current)  barScrollRef.current.scrollLeft  = barScrollRef.current.scrollWidth;
            }, 150);
        }
    }, [trendData, barData]);

    const stats = useMemo(() => {
        if (!logs || logs.length === 0) return null;
        const totalRounds  = logs.reduce((s, l) => s + (l.rounds        || 0), 0);
        const totalStudy   = logs.reduce((s, l) => s + (l.study_time    || 0), 0);
        const totalReading = logs.reduce((s, l) => s + (l.reading_time  || 0), 0);
        return {
            avgRounds:    (totalRounds / logs.length).toFixed(1),
            totalStudy,
            totalReading,
            days:         logs.length,
        };
    }, [logs]);

    if (!logs || logs.length === 0) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* ── Summary Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Avg Rounds',    value: stats.avgRounds,    color: 'text-saffron-600' },
                    { label: 'Total Study',   value: `${stats.totalStudy}m`,   color: 'text-blue-600' },
                    { label: 'Total Reading', value: `${stats.totalReading}m`, color: 'text-red-600'  },
                    { label: 'Days Logged',   value: stats.days,         color: 'text-green-600' },
                ].map(c => (
                    <div key={c.label} className="bg-white p-4 rounded-xl border border-saffron-100 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{c.label}</p>
                        <p className={`text-2xl font-serif font-bold ${c.color}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* ── 14-Day Multi-Line Trend Chart ─────────────────────────────── */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                    <h3 className="text-lg font-serif font-bold text-gray-800 flex items-center">
                        <span className="w-2 h-6 bg-saffron-500 rounded-full mr-3" />
                        Spiritual Diet Trend (30 Days)
                    </h3>
                    {/* Toggle buttons — mirrors HTML's Chart.js legend click */}
                    <div className="flex flex-wrap gap-2">
                        {DATASETS.map(d => (
                            <button
                                key={d.key}
                                onClick={() => toggleDataset(d.key)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                    visible[d.key]
                                        ? 'text-white border-transparent shadow-sm'
                                        : 'bg-white text-gray-400 border-gray-200'
                                }`}
                                style={visible[d.key] ? { backgroundColor: d.color, borderColor: d.color } : {}}
                            >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div ref={japaScrollRef} className="overflow-x-auto cursor-grab active:cursor-grabbing select-none">
                    <div style={{ width: `${Math.max(trendData.length * 90, 900)}px`, height: '260px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false} tickLine={false}
                                    tick={{ fontSize: 10, fill: '#666', fontWeight: 600 }}
                                    interval={0}
                                />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                {DATASETS.map(d => visible[d.key] && (
                                    <Line
                                        key={d.key}
                                        type="monotone"
                                        dataKey={d.key}
                                        name={d.label}
                                        stroke={d.color}
                                        strokeWidth={2.5}
                                        dot={{ r: 3, fill: d.color, strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 5, strokeWidth: 0 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2 italic">↔ Scroll to view all days</p>
            </div>

            {/* ── 30-Day Bar Chart (Reading / Hearing / Study) ──────────────── */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h3 className="text-lg font-serif font-bold text-gray-800 flex items-center">
                        <span className="w-2 h-6 bg-blue-500 rounded-full mr-3" />
                        Sadhana Time Distribution (m)
                    </h3>
                    <div className="flex flex-wrap gap-3 px-1">
                        {[
                            { color: '#ef4444', label: 'Reading' },
                            { color: '#8b5cf6', label: 'Hearing' },
                            { color: '#3b82f6', label: 'Study'   },
                        ].map(l => (
                            <div key={l.label} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                                <span className="text-[11px] font-bold text-gray-600">{l.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div ref={barScrollRef} className="overflow-x-auto cursor-grab active:cursor-grabbing select-none">
                    <div style={{ width: `${Math.max(barData.length * 70, 900)}px`, height: '280px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false} tickLine={false}
                                    tick={{ fontSize: 10, fill: '#666', fontWeight: 600 }}
                                    interval={0}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: 'rgba(241,245,249,0.5)' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                />
                                <Bar dataKey="reading" name="Reading" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={10} />
                                <Bar dataKey="hearing" name="Hearing" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={10} />
                                <Bar dataKey="study"   name="Study"   fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2 italic">↔ Scroll horizontally to view history</p>
            </div>
        </div>
    );
};

export default SadhanaAnalytics;
