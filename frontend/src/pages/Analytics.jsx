import { useState, useEffect, useMemo, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import api from '../api';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthContext from '../context/AuthContext';

const Analytics = () => {
    const { user } = useContext(AuthContext);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState(14); // 14 or 30 days

    // Protect route for roles that do not perform sadhana
    if (user?.role === 'owner' || ['brahmacari', 'other', 'yudhisthir'].includes(user?.group_name)) {
        return <Navigate to="/" />;
    }

    useEffect(() => {
        const fetchTrends = async () => {
            setLoading(true);
            try {
                const { data } = await api.get('/sadhana/trends');
                setLogs(data);
            } catch (err) {
                console.error("Failed to fetch trends", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTrends();
    }, []);

    // Process data for charts
    const chartData = useMemo(() => {
        if (!logs) return [];
        
        // Generate an array of the last N days
        const end = new Date();
        const start = subDays(end, timeframe - 1);
        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const displayStr = format(day, 'MMM dd');
            const logFound = logs.find(l => {
                const logDateStr = new Date(l.date).toLocaleDateString('en-CA'); // Get YYYY-MM-DD
                return logDateStr === dateStr || l.date.includes(dateStr);
            });

            return {
                date: displayStr,
                fullDate: dateStr,
                rounds: logFound?.rounds || 0,
                reading: logFound?.reading_time || 0,
                hearing: logFound?.hearing_time || 0,
                service: logFound?.service_hours || 0,
            };
        });
    }, [logs, timeframe]);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-saffron-100 gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-gray-800">Spiritual Trends</h1>
                    <p className="text-sm text-gray-500 mt-1">Visualize your sadhana consistency over time.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setTimeframe(14)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${timeframe === 14 ? 'bg-white text-saffron-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        14 Days
                    </button>
                    <button 
                        onClick={() => setTimeframe(30)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${timeframe === 30 ? 'bg-white text-saffron-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        30 Days
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Rounds Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
                        <span className="text-xl">📿</span> Japa Rounds
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} tickMargin={10} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} domain={[0, 'dataMax + 4']} allowDecimals={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '3 3' }}
                                />
                                <Line type="monotone" dataKey="rounds" name="Rounds" stroke="#f97316" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                <Line type="step" dataKey={() => 16} stroke="#e5e7eb" strokeDasharray="3 3" dot={false} strokeWidth={2} name="Target (16)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Hearing & Reading Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
                        <span className="text-xl">📚</span> Svanistha (Reading / Hearing)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} tickMargin={10} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{fill: '#f8fafc'}}
                                />
                                <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                                <Bar dataKey="reading" name="Reading (m)" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Line type="monotone" dataKey="hearing" name="Hearing (m)" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Service Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
                        <span className="text-xl">🧹</span> Practical Service (Seva)
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} tickMargin={10} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{fill: '#f8fafc'}}
                                />
                                <Bar dataKey="service" name="Seva (hours)" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
