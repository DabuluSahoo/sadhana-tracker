import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, History, RotateCcw } from 'lucide-react';
import api from '../api';

const JapaCounter = () => {
    const [beads, setBeads] = useState(0);
    const [rounds, setRounds] = useState(0);
    const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // Debounce ref to prevent too many API calls
    const timeoutRef = useRef(null);

    // Initial Load
    useEffect(() => {
        fetchTodayProgress();
        fetchHistory();
    }, []);

    const fetchTodayProgress = async () => {
        try {
            const { data } = await api.get('/japa/today');
            if (data) {
                setBeads(data.beads_count || 0);
                setRounds(data.rounds_completed || 0);
            }
        } catch (error) {
            console.error('Error fetching progress:', error);
        }
    };

    const fetchHistory = async () => {
        try {
            const { data } = await api.get('/japa/history');
            setHistory(data);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const syncProgress = useCallback((newBeads, newRounds) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            try {
                await api.post('/japa/sync', { beads_count: newBeads, rounds_completed: newRounds });
            } catch (error) {
                console.error('Error syncing progress:', error);
            }
        }, 1000); // Sync after 1 second of inactivity
    }, []);

    const handleTap = () => {
        // Haptic Feedback
        if (isVibrationEnabled && navigator.vibrate) {
            if (beads + 1 === 108) {
                navigator.vibrate([100, 50, 100]); // Long pattern for round completion
            } else {
                navigator.vibrate(15); // Short tick
            }
        }

        let nextBeads = beads + 1;
        let nextRounds = rounds;

        if (nextBeads >= 108) {
            nextBeads = 0;
            nextRounds += 1;
        }

        setBeads(nextBeads);
        setRounds(nextRounds);
        syncProgress(nextBeads, nextRounds);
    };

    const handleReset = () => {
        if (window.confirm('Reset current round progress?')) {
            setBeads(0);
            syncProgress(0, rounds);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-devotional-bg relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-saffron-300 blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-saffron-400 blur-3xl"></div>
            </div>

            {/* Header Controls */}
            <div className="absolute top-4 right-4 flex gap-3 z-10">
                <button
                    onClick={() => setIsVibrationEnabled(!isVibrationEnabled)}
                    className="p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-saffron-700 hover:bg-white transition-colors"
                >
                    {isVibrationEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-saffron-700 hover:bg-white transition-colors"
                >
                    <History size={20} />
                </button>
            </div>

            {/* Main Counter Area */}
            <div className="z-10 flex flex-col items-center gap-8 w-full max-w-md px-4">

                {/* Round Counter */}
                <div className="text-center">
                    <h2 className="text-saffron-900 text-lg font-medium opacity-80 uppercase tracking-widest text-xs mb-1">Total Rounds</h2>
                    <div className="text-6xl font-serif text-saffron-800 font-bold drop-shadow-sm">
                        {rounds}
                    </div>
                </div>

                {/* Bead Visualizer / Tap Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleTap}
                    className="w-64 h-64 rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 shadow-2xl flex items-center justify-center relative group isolate cursor-pointer touch-manipulation select-none -webkit-tap-highlight-color-transparent"
                    style={{
                        boxShadow: '0 20px 50px -12px rgba(234, 88, 12, 0.5)'
                    }}
                >
                    {/* Bead Ripple Effect */}
                    <div className="absolute inset-0 rounded-full border-4 border-white/20 group-active:border-white/40 transition-colors"></div>

                    {/* Inner Content */}
                    <div className="text-center text-white">
                        <div className="text-7xl font-bold font-serif tabular-nums leading-none mb-2">
                            {beads}
                        </div>
                        <div className="text-saffron-100 text-sm font-medium tracking-wide uppercase">
                            / 108 Beads
                        </div>
                    </div>
                </motion.button>

                {/* Reset Section */}
                <div className="flex justify-center w-full">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 text-saffron-700/60 hover:text-saffron-700 text-sm font-medium transition-colors px-4 py-2 rounded-lg hover:bg-saffron-50"
                    >
                        <RotateCcw size={14} />
                        Reset Current Beads
                    </button>
                </div>
            </div>

            {/* History Slide-up Panel */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-20 max-h-[50vh] overflow-hidden flex flex-col"
                    >
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-gray-800">History</h3>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto p-4 space-y-3">
                            {history.length > 0 ? (
                                history.map((record, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="text-gray-600 font-medium">
                                            {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-saffron-700 font-bold bg-saffron-100 px-3 py-1 rounded-lg">
                                            {record.rounds_completed} Rounds
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-400 py-8">
                                    No history recorded yet.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JapaCounter;
