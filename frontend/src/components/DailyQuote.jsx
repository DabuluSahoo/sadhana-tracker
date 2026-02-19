import React, { useMemo } from 'react';
import { Quote } from 'lucide-react';
import { quotes } from '../data/quotesData';

const DailyQuote = () => {
    const dailyQuote = useMemo(() => {
        // Use the current day of the year to select a quote so it changes every day
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        return quotes[dayOfYear % quotes.length];
    }, []);

    if (!dailyQuote) return null;

    return (
        <div className="relative overflow-hidden bg-white/40 backdrop-blur-md border border-white/40 p-6 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top duration-700 transition-colors">
            {/* Decorative background circle */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-saffron-200/30 rounded-full blur-3xl"></div>

            <div className="relative flex items-start space-x-4">
                <div className="bg-saffron-500/10 p-2 rounded-lg">
                    <Quote className="text-saffron-600 w-6 h-6" />
                </div>
                <div>
                    <p className="text-lg font-serif italic text-gray-800 leading-relaxed">
                        {dailyQuote.text}
                    </p>
                    <p className="mt-2 text-sm font-bold text-saffron-700 tracking-wide uppercase">
                        — {dailyQuote.source}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DailyQuote;
