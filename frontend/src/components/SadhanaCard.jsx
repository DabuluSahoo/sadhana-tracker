import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../api';
import toast from 'react-hot-toast';
import { Save, Clock, BookOpen, Music, Moon, Sun, Coffee, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from '../utils/platform';

const SadhanaCard = ({ date, existingData, onSave, isReadOnly = false, user }) => {
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
        nrcm: 0,
        reading_details: '',
        hearing_details: '',
        japa_completed_time: '',
        placement_time: 0,
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
                nrcm: existingData.nrcm || 0,
                reading_details: existingData.reading_details || '',
                hearing_details: existingData.hearing_details || '',
                japa_completed_time: existingData.japa_completed_time || '',
                placement_time: existingData.placement_time || 0,
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
                nrcm: 0,
                reading_details: '',
                hearing_details: '',
                japa_completed_time: '',
                placement_time: 0,
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
            
            // 🪷 Clear sticky reminder if it exists AND we are saving a report for EXACTLY yesterday
            if (isNative()) {
                try {
                    const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
                    const reportDateStr = format(date, 'yyyy-MM-dd');
                    
                    // Only clear if the report is exactly for yesterday
                    if (reportDateStr === yesterdayStr) {
                        await LocalNotifications.cancel({ notifications: [{ id: 108 }] });
                        console.log('Sticky reminder cleared for yesterday\'s report');
                    }
                } catch (err) {
                    console.error('Failed to clear local notification:', err);
                }
            }

            setShowSuccess(true);
            if (onSave) onSave();
        } catch (error) {
            toast.error('Failed to save report');
            console.error(error);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-orange-100 overflow-hidden transition-colors">
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
                            Japa (Rounds & Time)
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="number"
                                name="rounds"
                                min="0"
                                max={9999}
                                value={formData.rounds}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                className="input-field w-1/2"
                                placeholder="Rounds"
                            />
                            <input
                                type="time"
                                name="japa_completed_time"
                                value={formData.japa_completed_time}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                className="input-field w-1/2"
                            />
                        </div>
                    </div>

                    {/* NRCM */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-teal-100 p-1.5 rounded-md mr-2 text-teal-700"><Award size={16} /></div>
                            NRCM
                        </label>
                        <input
                            type="number"
                            name="nrcm"
                            min="0"
                            value={formData.nrcm}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field"
                            placeholder="Count..."
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

                    {/* Reading */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-red-100 p-1.5 rounded-md mr-2 text-red-700"><BookOpen size={16} /></div>
                            Reading (Minutes & Details)
                        </label>
                        <input
                            type="number"
                            name="reading_time"
                            min="0"
                            value={formData.reading_time}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field mb-2"
                            placeholder="Total minutes..."
                        />
                        <input
                            type="text"
                            name="reading_details"
                            value={formData.reading_details}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field text-sm"
                            placeholder="What did you read?"
                        />
                    </div>

                    {/* Hearing */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <div className="bg-purple-100 p-1.5 rounded-md mr-2 text-purple-700"><Music size={16} /></div>
                            Hearing (Minutes & Details)
                        </label>
                        <input
                            type="number"
                            name="hearing_time"
                            min="0"
                            value={formData.hearing_time}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field mb-2"
                            placeholder="Total minutes..."
                        />
                        <input
                            type="text"
                            name="hearing_details"
                            value={formData.hearing_details}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="input-field text-sm"
                            placeholder="What did you hear?"
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

                    {/* Placement — Arjun/Bhima only */}
                    {['arjun', 'bhima'].includes((user?.group_name || '').toLowerCase()) && (
                        <div className="space-y-2">
                            <label className="flex items-center text-sm font-medium text-gray-700">
                                <div className="bg-blue-100 p-1.5 rounded-md mr-2 text-blue-700"><BookOpen size={16} /></div>
                                Placement Study (Minutes)
                            </label>
                            <input
                                type="number"
                                name="placement_time"
                                min="0"
                                value={formData.placement_time}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                className="input-field"
                                placeholder="Placement prep mins..."
                            />
                        </div>
                    )}

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
                    <div className="col-span-1 md:col-span-2">
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
                    <div className="col-span-1 md:col-span-2 space-y-2">
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
                        <motion.h2
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
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
