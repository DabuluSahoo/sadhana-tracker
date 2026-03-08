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
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm transition-colors">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-serif font-bold text-gray-800 flex items-center">
                            <span className="w-2 h-6 bg-blue-500 rounded-full mr-3"></span>
                            Sadhana Time Distribution (m)
                        </h3>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight bg-gray-100 px-2 py-1 rounded">Last 30 Days • Scroll Left/Right ↔</p>
                    </div>
                    
                    <div className="flex h-[300px]">
                        {/* Fixed Y-Axis */}
                        <div className="flex-none bg-white z-10 pr-2 border-r border-gray-50">
                            <ResponsiveContainer width={40} height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -15, bottom: 25 }}>
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#999' }} 
                                        width={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Scrollable Bars & X-Axis */}
                        <div className="flex-grow overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            <div style={{ minWidth: logs.length > 7 ? `${logs.length * 60}px` : '100%', height: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fill: '#666' }} 
                                            interval={0}
                                            height={30}
                                        />
                                        <YAxis hide domain={['auto', 'auto']} />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                        <Bar dataKey="reading" name="📖 Reading" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar dataKey="hearing" name="🎧 Hearing" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar dataKey="study" name="📚 Study" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SadhanaAnalytics;
