import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { useState } from 'react';
import { VAISHNAVA_EVENTS } from '../data/vaishnavaCalendarData';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import clsx from 'clsx';

const CalendarPage = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const getEventForDate = (date) => {
        return VAISHNAVA_EVENTS.find(event => isSameDay(new Date(event.date), date));
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-serif font-bold text-gray-800">Vaishnava Calendar</h2>
                <div className="flex items-center space-x-4">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-saffron-50 rounded-full text-saffron-600 transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-lg font-bold min-w-[120px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-saffron-50 rounded-full text-saffron-600 transition-colors">
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {days.map(day => {
                    const event = getEventForDate(day);
                    return (
                        <div
                            key={day.toString()}
                            className={clsx(
                                "p-4 rounded-xl border transition-all h-full",
                                event ? (
                                    event.type.includes('ekadashi') ? "bg-green-50 border-green-200" :
                                        event.type === 'maha-festival' ? "bg-saffron-50 border-saffron-200 shadow-sm" :
                                            "bg-blue-50 border-blue-200"
                                ) : "bg-white border-gray-100 opacity-60 grayscale-[0.5]"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xl font-bold text-gray-400">{format(day, 'd')}</span>
                                <span className="text-xs font-medium uppercase text-gray-500">{format(day, 'EEE')}</span>
                            </div>
                            {event ? (
                                <div className="space-y-2">
                                    <h4 className={clsx(
                                        "font-bold font-serif leading-tight",
                                        event.type.includes('ekadashi') ? "text-green-800" :
                                            event.type === 'maha-festival' ? "text-saffron-800" :
                                                "text-blue-800"
                                    )}>
                                        {event.name}
                                    </h4>
                                    {event.description && (
                                        <div className="flex items-start text-xs opacity-80 italic">
                                            <Info size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                                            <span>{event.description}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-gray-300 text-sm italic">Standard Day</div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="bg-saffron-50 p-6 rounded-xl border border-saffron-100 text-sm text-saffron-800">
                <p className="flex items-center font-bold mb-2">
                    <Info size={16} className="mr-2" />
                    Important Note
                </p>
                <p>Ekadashi fasting and breaking times (Parana) can vary slightly based on your local sunrise. For exact timings, please check your local ISKCON temple or the official ISKCON Vaishnava Calendar app.</p>
            </div>
        </div>
    );
};

export default CalendarPage;
