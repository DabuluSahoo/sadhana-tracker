import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, Lock } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const inputClass = "pl-10 block w-full border border-gray-300 rounded-md py-2 focus:ring-saffron-500 focus:border-saffron-500 transition-colors";
    const btnClass = "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-saffron-600 hover:bg-saffron-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            toast.success('OTP sent to your email!');
            setStep(2);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Email not found');
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        // We'll verify OTP on the reset step to avoid double verification
        setStep(3);
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { email, otp, newPassword });
            toast.success('Password reset successfully!');
            setDone(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid OTP or expired');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-saffron-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden md:max-w-lg border border-saffron-100">
                <div className="bg-saffron-600 py-6 px-8 text-center">
                    <h2 className="text-2xl font-serif font-bold text-white">Sadhana Tracker</h2>
                    <p className="text-saffron-100 mt-2">Reset Your Password</p>
                    {!done && (
                        <div className="flex justify-center gap-2 mt-3">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={`w-3 h-3 rounded-full ${step >= s ? 'bg-white' : 'bg-saffron-400'}`} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="py-8 px-8 space-y-6">
                    {done ? (
                        <div className="text-center space-y-4">
                            <div className="text-4xl">✅</div>
                            <p className="text-gray-700 font-medium">Password reset successfully!</p>
                            <Link to="/login" className="block w-full text-center py-3 px-4 rounded-md text-white bg-saffron-600 hover:bg-saffron-700">
                                Go to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <form onSubmit={handleSendOtp} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail size={18} className="text-gray-400" />
                                            </div>
                                            <input type="email" required className={inputClass} placeholder="Enter your email"
                                                value={email} onChange={(e) => setEmail(e.target.value)} />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} className={btnClass}>
                                        {loading ? 'Sending OTP...' : 'Send OTP'}
                                    </button>
                                </form>
                            )}

                            {step === 2 && (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <p className="text-sm text-gray-600 text-center">OTP sent to <strong>{email}</strong></p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <KeyRound size={18} className="text-gray-400" />
                                            </div>
                                            <input type="text" required maxLength={6} className={inputClass} placeholder="6-digit OTP"
                                                value={otp} onChange={(e) => setOtp(e.target.value)} />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} className={btnClass}>Next</button>
                                    <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-saffron-600 hover:underline">
                                        ← Change email
                                    </button>
                                </form>
                            )}

                            {step === 3 && (
                                <form onSubmit={handleReset} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock size={18} className="text-gray-400" />
                                            </div>
                                            <input type="password" required className={inputClass} placeholder="Enter new password"
                                                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} className={btnClass}>
                                        {loading ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </form>
                            )}
                        </>
                    )}

                    <div className="text-center">
                        <Link to="/login" className="text-sm text-saffron-600 hover:underline">← Back to Login</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
