import { useState, useEffect, useContext } from 'react';
import api from '../api';
import { format, subDays } from 'date-fns';
import { FileText, ChevronDown } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateWeeklySadhanaReport, generateCustomRangeSadhanaReport } from '../utils/reportUtils';
import AuthContext from '../context/AuthContext';

const History = () => {
    const [logs, setLogs]       = useState([]);
    const [loading, setLoading] = useState(true);
    const { user }              = useContext(AuthContext);
    const [showCustom, setShowCustom]   = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd]     = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data } = await api.get('/sadhana/history');
                setLogs(data);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (loading) return <LoadingSpinner />;

    const minDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');
    const maxDate = format(subDays(new Date(), 1),   'yyyy-MM-dd');

    return (
        <div className="space-y-6 max-w-7xl mx-auto">

            {/* Header + Download buttons */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-serif font-bold text-gray-800">Your Sadhana History</h2>

                <div className="flex flex-wrap gap-2 items-start">
                    {/* Last completed week */}
                    <button
                        onClick={() => generateWeeklySadhanaReport(user.username, logs)}
                        className="flex items-center px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 transition-colors shadow-md text-sm font-medium"
                    >
                        <FileText size={16} className="mr-2" />
                        Download Last Week
                    </button>

                    {/* Custom range */}
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => setShowCustom(v => !v)}
                            className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-md text-sm font-medium"
                        >
                            <FileText size={16} className="mr-2" />
                            Custom Range
                            <ChevronDown size={14} className={`ml-1.5 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
                        </button>

                        {showCustom && (
                            <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                                <p className="text-xs text-amber-700 font-semibold">Select date range</p>
                                <div className="flex gap-2 items-end flex-wrap">
                                    <div>
                                        <p className="text-[10px] text-gray-500 mb-0.5">From</p>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={e => setCustomStart(e.target.value)}
                                            min={minDate} max={maxDate}
                                            className="text-sm border border-amber-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 mb-0.5">To</p>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={e => setCustomEnd(e.target.value)}
                                            min={minDate} max={maxDate}
                                            className="text-sm border border-amber-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (!customStart || !customEnd) return alert('Please select both dates');
                                            if (customEnd < customStart) return alert('End date must be after start date');
                                            generateCustomRangeSadhanaReport(user.username, logs, customStart, customEnd);
                                        }}
                                        className="px-4 py-1.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Table ONLY */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-serif font-bold text-gray-700">Detailed Logs</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Showing up to last 365 days</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grace</th>
                                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Wake</th>
                                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rounds</th>
                                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Japa Done</th>
                                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Read (m)</th>
                                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hear (m)</th>
                                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rest (m)</th>
                                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sleep</th>
                                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Seva (h)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 py-4 whitespace-nowrap text-xs font-semibold text-gray-900 border-r border-gray-100">
                                        {format(new Date(log.date), 'dd/MM/yy')}
                                    </td>
                                    <td className="px-3 py-4 text-[11px] text-blue-700 italic font-medium max-w-[150px] truncate border-r border-gray-100">
                                        {log.admin_comment || '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-600 border-r border-gray-100">{log.wakeup_time || '-'}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs font-bold text-gray-800 border-r border-gray-100">{log.rounds || 0}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500 border-r border-gray-100">{log.japa_completed_time || '-'}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-600 border-r border-gray-100">{log.reading_time || 0}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-600 border-r border-gray-100">{log.hearing_time || 0}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs text-amber-700 font-medium border-r border-gray-100">{log.dayrest_time || 0}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500 border-r border-gray-100">{log.sleep_time || '-'}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs text-green-700 font-bold">{log.service_hours || 0}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                                        No history found. Start your sadhana today!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default History;
