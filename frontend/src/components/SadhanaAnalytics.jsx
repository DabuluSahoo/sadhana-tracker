import { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

const SadhanaAnalytics = ({ logs }) => {
    const chartData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        // Sort logs by date ascending
        const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));

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
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-saffron-100 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Avg Rounds</p>
                    <p className="text-2xl font-serif font-bold text-saffron-600">{stats.avgRounds}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-saffron-100 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Study</p>
                    <p className="text-2xl font-serif font-bold text-blue-600">{stats.totalStudy}m</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-saffron-100 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Reading</p>
                    <p className="text-2xl font-serif font-bold text-red-600">{stats.totalReading}m</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-saffron-100 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Days Logged</p>
                    <p className="text-2xl font-serif font-bold text-green-600">{stats.days}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Japa Rounds Trend */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-serif font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-2 h-6 bg-saffron-500 rounded-full mr-3"></span>
                        Japa Rounds Trend
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} domain={[0, 20]} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="rounds"
                                    stroke="#ea580c"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#ea580c', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Time Distribution Bar Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-serif font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-2 h-6 bg-blue-500 rounded-full mr-3"></span>
                        Time Distribution (m)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Bar dataKey="reading" name="Reading" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="hearing" name="Hearing" fill="#8b5cf6" stackId="a" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="study" name="Study" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="service" name="Service" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SadhanaAnalytics;
