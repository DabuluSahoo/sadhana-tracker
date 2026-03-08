import { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

const SadhanaAnalytics = ({ logs }) => {
    const chartData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        // Sort logs by date ascending and take the last 30 days
        const sortedLogs = [...logs]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-30);

        return sortedLogs.map(log => ({
            date: format(parseISO(log.date), 'MMM d'),
            rounds: log.rounds || 0,
            reading: log.reading_time || 0,
            hearing: log.hearing_time || 0,
            study: log.study_time || 0,
            service: (log.service_hours || 0) * 60, // Convert hours to minutes for scaling
        }));
    }, [logs]);

    const stats = useMemo(() => {
        if (!logs || logs.length === 0) return null;
        const totalRounds = logs.reduce((sum, l) => sum + (l.rounds || 0), 0);
        const avgRounds = (totalRounds / logs.length).toFixed(1);
        const totalStudy = logs.reduce((sum, l) => sum + (l.study_time || 0), 0);
        const totalReading = logs.reduce((sum, l) => sum + (l.reading_time || 0), 0);

        return { avgRounds, totalStudy, totalReading, days: logs.length };
    }, [logs]);

    if (!logs || logs.length === 0) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700 transition-colors">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-saffron-100 shadow-sm transition-colors">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Avg Rounds</p>
                    <p className="text-2xl font-serif font-bold text-saffron-600">{stats.avgRounds}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-saffron-100 shadow-sm transition-colors">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Study</p>
                    <p className="text-2xl font-serif font-bold text-blue-600">{stats.totalStudy}m</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-saffron-100 shadow-sm transition-colors">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Reading</p>
                    <p className="text-2xl font-serif font-bold text-red-600">{stats.totalReading}m</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-saffron-100 shadow-sm transition-colors">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Days Logged</p>
                    <p className="text-2xl font-serif font-bold text-green-600">{stats.days}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Japa Rounds Trend */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-colors">
                    <h3 className="text-lg font-serif font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-2 h-6 bg-saffron-500 rounded-full mr-3"></span>
                        Japa Rounds Trend (30 Days)
                    </h3>
                    <div className="h-[220px] sm:h-[300px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%" debounce={100}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} domain={[0, 20]} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="rounds"
                                    stroke="#ea580c"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: '#ea580c', strokeWidth: 1.5, stroke: '#fff' }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Time Distribution Bar Chart - Grouped & Scrollable */}
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm transition-colors relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-2">
                        <h3 className="text-lg font-serif font-bold text-gray-800 flex items-center">
                            <span className="w-2 h-6 bg-blue-500 rounded-full mr-3"></span>
                            Sadhana Time Distribution (m)
                        </h3>
                        {/* Static Custom Legend */}
                        <div className="flex flex-wrap gap-4 px-2 justify-center sm:justify-end">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                                <span className="text-[11px] font-bold text-gray-600">Reading</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
                                <span className="text-[11px] font-bold text-gray-600">Hearing</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                                <span className="text-[11px] font-bold text-gray-600">Study</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        {/* FIXED Y-AXIS OVERLAY */}
                        <div className="absolute left-0 top-0 bottom-0 w-[45px] bg-white/90 backdrop-blur-[2px] z-20 flex flex-col justify-between py-[10px] pointer-events-none border-r border-gray-50 uppercase text-[10px] font-bold text-gray-400">
                            <div className="pl-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 30 }}>
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fill: '#999', fontWeight: 'bold' }}
                                            width={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* SCROLLABLE CONTENT */}
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent pl-[45px]">
                            <div style={{ minWidth: chartData.length > 6 ? `${chartData.length * 60}px` : '100%', height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fill: '#666', fontWeight: 500 }} 
                                            interval={0}
                                            height={30}
                                        />
                                        <YAxis hide domain={[0, 'auto']} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                                            contentStyle={{ 
                                                borderRadius: '12px', 
                                                border: 'none', 
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                padding: '12px'
                                            }}
                                        />
                                        <Bar dataKey="reading" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar dataKey="hearing" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar dataKey="study" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight bg-gray-50 inline-block px-3 py-1 rounded-full border border-gray-100">
                           ↔ Scroll horizontally to view {chartData.length} days of history
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SadhanaAnalytics;
