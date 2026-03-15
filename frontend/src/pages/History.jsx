import { useState, useEffect, useContext } from 'react';
import api from '../api';
import { format, subDays } from 'date-fns';
import { FileText, ChevronDown } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SadhanaAnalytics from '../components/SadhanaAnalytics';
import { generateWeeklySadhanaReport, generateCustomRangeSadhanaReport } from '../utils/reportUtils';
import AuthContext from '../context/AuthContext';

const History = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const [showCustom, setShowCustom] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

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

    const minDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const maxDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-serif font-bold text-gray-800">Your Sadhana Progress</h2>

                {/* Download buttons */}
                <div className="flex flex-wrap gap-2 items-start">
                    {/* Last completed week */}
                    <button
                        onClick={() => generateWeeklySadhanaReport(user.username, logs)}
                        className="flex items-center px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 transition-colors shadow-md text-sm font-medium"
                    >
                        <FileText size={16} className="mr-2" />
                        Download Last Week
                    </button>

                    {/* Custom range toggle */}
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
                                <p className="text-xs text-amber-700 font-semibold">Select date range (last 30 days only)</p>
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

            {logs.length > 0 && <SadhanaAnalytics logs={logs} />}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-serif font-bold text-gray-700">Detailed Logs</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rounds</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NRCM</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Read/Hear</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Study/Service/Rest</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mangala In</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {format(new Date(log.date), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.rounds >= 16 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {log.rounds} {log.japa_completed_time && `(${log.japa_completed_time})`}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-bold">
                                        {log.nrcm || 0}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                                        <div className="flex flex-col gap-1">
                                            {log.reading_time > 0 && <span>📚 {log.reading_time}m {log.reading_details && <span className="text-gray-400 text-xs truncate">({log.reading_details})</span>}</span>}
                                            {log.hearing_time > 0 && <span>🎧 {log.hearing_time}m {log.hearing_details && <span className="text-gray-400 text-xs truncate">({log.hearing_details})</span>}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex flex-col gap-1">
                                            {log.study_time > 0 && <span>📖 {log.study_time}m</span>}
                                            {log.service_hours > 0 && <span>🧹 {log.service_hours}h</span>}
                                            {log.dayrest_time > 0 && <span className="text-amber-600 font-medium">🛌 {log.dayrest_time}m</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.mangala_aarti ?
                                            <span className="text-green-600">Yes</span> :
                                            <span className="text-gray-400">No</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{log.comments}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No history found. Start your sadhana today!</td>
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
