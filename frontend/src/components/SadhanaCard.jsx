import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../api';
import toast from 'react-hot-toast';
import { Save, Clock, BookOpen, Music, Moon, Sun, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SadhanaCard = ({ date, existingData, onSave, isReadOnly = false }) => {
    const [formData, setFormData] = useState({
        rounds: 0,
        reading_time: 0,
        hearing_time: 0,
        study_time: 0,
        dayrest_time: 0,
        mangala_aarti: false,
        wakeup_time: '',
        sleep_time: '',
        service_hours: 0,
        comments: '',
    });

    useEffect(() => {
        if (existingData) {
            setFormData({
                rounds: existingData.rounds || 0,
                reading_time: existingData.reading_time || 0,
                hearing_time: existingData.hearing_time || 0,
                study_time: existingData.study_time || 0,
                dayrest_time: existingData.dayrest_time || 0,
                mangala_aarti: existingData.mangala_aarti || false,
                wakeup_time: existingData.wakeup_time || '',
                sleep_time: existingData.sleep_time || '',
                service_hours: existingData.service_hours || 0,
                comments: existingData.comments || '',
            });
        } else {
            // Reset if no data for this day
            setFormData({
                rounds: 0,
                reading_time: 0,
                hearing_time: 0,
                study_time: 0,
                dayrest_time: 0,
                mangala_aarti: false,
                wakeup_time: '',
                sleep_time: '',
                service_hours: 0,
                comments: '',
            });
        }
    }, [existingData, date]);

    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => setShowSuccess(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;

        try {
            await api.post('/sadhana', { ...formData, date: format(date, 'yyyy-MM-dd') });
            toast.success('Sadhana report saved successfully');
            setShowSuccess(true);
            if (onSave) onSave();
        } catch (error) {
            toast.error('Failed to save report');
            console.error(error);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-orange-100 overflow-hidden">
            <div className="bg-saffron-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
                <h3 className="text-lg font-serif font-semibold text-saffron-800">
                    Sadhana for {format(date, 'EEEE, MMMM do, yyyy')}
                </h3>
                {existingData && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Submitted</span>}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Chanting */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-orange-100 p-1.5 rounded-md mr-2 text-saffron-700"><Sun size={16} /></div>
                            Japa Rounds (1-16+)
                        </label>
                        <input
                            type="number"
                            name="rounds"
                            min="0"
                            max="64"
                            value={formData.rounds}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field"
                        />
                    </div>

                    {/* Wake up Time */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-blue-100 p-1.5 rounded-md mr-2 text-blue-700"><Clock size={16} /></div>
                            Wake Up Time
                        </label>
                        <input
                            type="time"
                            name="wakeup_time"
                            value={formData.wakeup_time}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field"
                        />
                    </div>

                    {/* Reading */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-red-100 p-1.5 rounded-md mr-2 text-red-700"><BookOpen size={16} /></div>
                            Reading (Minutes)
                        </label>
                        <input
                            type="number"
                            name="reading_time"
                            min="0"
                            value={formData.reading_time}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field"
                        />
                    </div>

                    {/* Sleep Time */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-indigo-100 p-1.5 rounded-md mr-2 text-indigo-700"><Moon size={16} /></div>
                            Sleep Time
                        </label>
                        <input
                            type="time"
                            name="sleep_time"
                            value={formData.sleep_time}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field"
                        />
                    </div>

                    {/* Hearing */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-purple-100 p-1.5 rounded-md mr-2 text-purple-700"><Music size={16} /></div>
                            Hearing/Kirtan (Minutes)
                        </label>
                        <input
                            type="number"
                            name="hearing_time"
                            min="0"
                            value={formData.hearing_time}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field"
                        />
                    </div>

                    {/* Service Hours */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-gray-100 p-1.5 rounded-md mr-2 text-gray-700"><Coffee size={16} /></div>
                            Service (Hours)
                        </label>
                        <input
                            type="number"
                            name="service_hours"
                            min="0"
                            step="0.5"
                            value={formData.service_hours}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field"
                        />
                    </div>

                    {/* Study */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-green-100 p-1.5 rounded-md mr-2 text-green-700"><BookOpen size={16} /></div>
                            Study (Minutes)
                        </label>
                        <input
                            type="number"
                            name="study_time"
                            min="0"
                            value={formData.study_time}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field"
                        />
                    </div>

                    {/* Day Rest */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-yellow-100 p-1.5 rounded-md mr-2 text-yellow-700"><Moon size={16} /></div>
                            Day Rest (Minutes)
                        </label>
                        <input
                            type="number"
                            name="dayrest_time"
                            min="0"
                            value={formData.dayrest_time}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field"
                        />
                    </div>

                    {/* Mangala Aarti */}
                    <div className="md:col-span-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="mangala_aarti"
                                checked={formData.mangala_aarti}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                className="h-5 w-5 text-saffron-600 focus:ring-saffron-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Attended Mangala Aarti</span>
                        </label>
                    </div>

                    {/* Comments */}
                    <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Comments / Realizations</label>
                        <textarea
                            name="comments"
                            rows="3"
                            value={formData.comments}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field py-2"
                            placeholder="Any obstacles or spiritual realizations today?"
                        ></textarea>
                    </div>
                </div>

                {!isReadOnly && (
                    <div className="pt-4">
                        <button type="submit" className="btn-primary flex justify-center items-center">
                            <Save size={20} className="mr-2" />
                            Save Report
                        </button>
                    </div>
                )}
            </form>

            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)' }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-saffron-600/95 pointer-events-none"
                    >
                        <motion.img
                            src="/voice-iskcon-logo.svg"
                            alt="VOICE ISKCON Logo"
                            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                            animate={{ scale: 1.1, opacity: 1, rotate: 0 }}
                            transition={{ duration: 0.8, type: "spring" }}
                            className="w-64 h-64 mb-8"
                        />
                        <motion.h2
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                            className="text-5xl md:text-8xl font-serif font-bold text-white tracking-widest italic px-4 text-center"
                        >
                            HARE KRISHNA
                        </motion.h2>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SadhanaCard;
