import { getNoticeForToday } from '../utils/vaishnavaCalendarUtils';
import { Calendar, Bell, Info } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

const VaishnavaBanner = () => {
    const notice = getNoticeForToday();

    if (!notice) return null;

    const isEkadashi = notice.type.includes('ekadashi');
    const isMahaFestival = notice.type === 'maha-festival';

    return (
        <div className={clsx(
            "p-4 rounded-xl border shadow-sm transition-all animate-in fade-in slide-in-from-top-2 duration-500",
            isEkadashi ? "bg-green-50 border-green-200 text-green-800" :
                isMahaFestival ? "bg-saffron-50 border-saffron-200 text-saffron-800" :
                    "bg-blue-50 border-blue-200 text-blue-800"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className={clsx(
                        "p-2 rounded-lg",
                        isEkadashi ? "bg-green-100" :
                            isMahaFestival ? "bg-saffron-100" :
                                "bg-blue-100"
                    )}>
                        {isEkadashi ? (
                            <LeafIcon className="w-6 h-6 text-green-600" />
                        ) : isMahaFestival ? (
                            <Bell className="w-6 h-6 text-saffron-600" />
                        ) : (
                            <Calendar className="w-6 h-6 text-blue-600" />
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold font-serif flex items-center">
                            {notice.status === 'today' ? "Today's Event: " : "Upcoming: "}
                            {notice.name}
                        </h4>
                        <p className="text-sm opacity-90">{notice.description || "A special day for spiritual practice."}</p>
                    </div>
                </div>
                <Link
                    to="/calendar"
                    className="flex items-center text-xs font-bold uppercase tracking-wider hover:underline"
                >
                    View Calendar
                    <Info size={14} className="ml-1" />
                </Link>
            </div>
        </div>
    );
};

const LeafIcon = ({ className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 21 2c-2.5 4-3 5.5-4.1 11.2A7 7 0 0 1 11 20z" />
        <path d="M11 20V10" />
    </svg>
);

export default VaishnavaBanner;
