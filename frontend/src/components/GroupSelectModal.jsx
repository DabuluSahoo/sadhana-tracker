import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import toast from 'react-hot-toast';

const GROUPS = [
    {
        key: 'sahadev',
        level: 1,
        emoji: '🌱',
        color: 'from-emerald-400 to-emerald-600',
        border: 'border-emerald-400',
        desc: 'Entry level — beginning the spiritual journey',
    },
    {
        key: 'nakul',
        level: 2,
        emoji: '🌿',
        color: 'from-teal-400 to-teal-600',
        border: 'border-teal-400',
        desc: 'Developing steadiness in sadhana practice',
    },
    {
        key: 'arjun',
        level: 3,
        emoji: '🪷',
        color: 'from-saffron-400 to-saffron-600',
        border: 'border-saffron-400',
        desc: 'Committed practitioner with deeper understanding',
    },
    {
        key: 'bhima',
        level: 4,
        emoji: '🏆',
        color: 'from-amber-400 to-amber-600',
        border: 'border-amber-400',
        desc: 'Advanced devotee with strong sadhana foundation',
    },
];

const GroupSelectModal = ({ onComplete }) => {
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!selected) return toast.error('Please select a group first');
        setLoading(true);
        try {
            const { data } = await api.put('/auth/set-group', { group_name: selected });
            toast.success(`Group set to ${selected.charAt(0).toUpperCase() + selected.slice(1)}!`);
            onComplete(data.group_name);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to set group');
        }
        setLoading(false);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            >
                <motion.div
                    initial={{ scale: 0.85, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
                >
                    {/* Header - Fixed */}
                    <div className="bg-saffron-600 px-8 py-4 sm:py-6 text-center flex-shrink-0">
                        <img src="/voice_logo.svg" alt="VOICE" className="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2" style={{ filter: 'brightness(0) invert(1)' }} />
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Welcome, Devotee! 🙏</h2>
                        <p className="text-saffron-100 text-xs sm:text-sm mt-1">Please select your Sadhana Group to continue</p>
                    </div>

                    {/* Group Cards - Scrollable */}
                    <div className="px-6 py-4 space-y-3 overflow-y-auto flex-grow">
                        {GROUPS.map((g) => (
                            <button
                                key={g.key}
                                onClick={() => setSelected(g.key)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left
                                    ${selected === g.key
                                        ? `${g.border} bg-saffron-50 shadow-md scale-[1.02]`
                                        : 'border-gray-200 hover:border-saffron-300 hover:bg-saffron-50/40'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${g.color} flex items-center justify-center text-xl flex-shrink-0 shadow`}>
                                    {g.emoji}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-800 capitalize">{g.key} Group</span>
                                        <span className="text-xs bg-saffron-100 text-saffron-700 px-2 py-0.5 rounded-full font-medium">Level {g.level}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{g.desc}</p>
                                </div>
                                {selected === g.key && (
                                    <div className="w-5 h-5 rounded-full bg-saffron-500 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Action */}
                    <div className="px-6 pb-6">
                        <p className="text-xs text-gray-400 text-center mb-3">⚠️ This selection is permanent and cannot be changed later.</p>
                        <button
                            onClick={handleConfirm}
                            disabled={!selected || loading}
                            className="w-full py-3 rounded-xl bg-saffron-600 hover:bg-saffron-700 text-white font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : `Confirm — ${selected ? selected.charAt(0).toUpperCase() + selected.slice(1) + ' Group' : 'Select a Group'}`}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default GroupSelectModal;
