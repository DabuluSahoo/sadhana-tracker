import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks } from 'date-fns';
import api from '../api';
import SadhanaCard from '../components/SadhanaCard';
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const Dashboard = () => {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weeklyLogs, setWeeklyLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWeeklyLogs = async () => {
        try {
            setLoading(true);
            const start = format(currentWeekStart, 'yyyy-MM-dd');
            const end = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
            const { data } = await api.get(`/sadhana/weekly?startDate=${start}&endDate=${end}`);
            setWeeklyLogs(data);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeeklyLogs();
    }, [currentWeekStart]);

    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    const getLogForDate = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return weeklyLogs.find(log => log.date.startsWith(dateStr));
    };

    const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

    // Is this week the current real-time week?
    const isCurrentWeek = isSameDay(startOfWeek(new Date()), currentWeekStart);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 font-serif">
                        {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
                    </h2>
                    {isCurrentWeek ? (
                        <span className="bg-saffron-100 text-saffron-700 text-xs px-2 py-1 rounded-full font-medium">Current Week</span>
                    ) : (
                        <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4 overflow-x-auto pb-2">
                {weekDays.map((day) => {
                    const log = getLogForDate(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const isFuture = day > new Date() && !isToday;

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => setSelectedDate(day)}
                            disabled={isFuture}
                            className={clsx(
                                "flex flex-col items-center p-3 rounded-lg min-w-[60px] transition-all border",
                                isSelected
                                    ? "bg-saffron-600 text-white border-saffron-600 shadow-md transform scale-105"
                                    : isFuture
                                        ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-saffron-300 hover:bg-saffron-50",
                                isToday && !isSelected && "ring-2 ring-saffron-400 ring-offset-2"
                            )}
                        >
                            <span className="text-xs font-medium uppercase">{format(day, 'EEE')}</span>
                            <span className="text-lg font-bold mt-1">{format(day, 'd')}</span>
                            <div className="mt-2 h-2 w-2 rounded-full">
                                {log ? (
                                    <div className={clsx("h-2 w-2 rounded-full", isSelected ? "bg-white" : "bg-green-500")} />
                                ) : !isFuture && (
                                    <div className={clsx("h-2 w-2 rounded-full", isSelected ? "bg-saffron-800" : "bg-gray-200")} />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-6">
                <SadhanaCard
                    date={selectedDate}
                    existingData={getLogForDate(selectedDate)}
                    onSave={fetchWeeklyLogs}
                    isReadOnly={selectedDate > new Date()}
                />
            </div>
        </div>
    );
};

export default Dashboard;
