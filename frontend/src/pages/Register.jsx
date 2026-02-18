import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, KeyRound } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const Register = () => {
    const [step, setStep] = useState(1); // 1: email, 2: otp, 3: username+password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/send-otp', { email });
            toast.success('OTP sent to your email!');
            setStep(2);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send OTP');
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/verify-otp', { email, otp });
            toast.success('Email verified!');
            setStep(3);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid OTP');
        }
        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/register', { email, username, password });
            toast.success('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        }
        setLoading(false);
    };

    const inputClass = "pl-10 block w-full border border-gray-300 rounded-md py-2 focus:ring-saffron-500 focus:border-saffron-500 transition-colors";
    const btnClass = "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-saffron-600 hover:bg-saffron-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

    return (
        <div className="min-h-screen flex items-center justify-center bg-saffron-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden md:max-w-lg border border-saffron-100">
                <div className="bg-saffron-600 py-6 px-8 text-center">
                    <h2 className="text-2xl font-serif font-bold text-white">Sadhana Tracker</h2>
                    <p className="text-saffron-100 mt-2">
                        {step === 1 && 'Step 1: Enter your email'}
                        {step === 2 && 'Step 2: Verify your email'}
                        {step === 3 && 'Step 3: Create your account'}
                    </p>
                    {/* Step indicator */}
                    <div className="flex justify-center gap-2 mt-3">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`w-3 h-3 rounded-full ${step >= s ? 'bg-white' : 'bg-saffron-400'}`} />
                        ))}
                    </div>
                </div>

                <div className="py-8 px-8 space-y-6">
                    {/* Step 1: Email */}
                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
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

                    {/* Step 2: OTP */}
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
                            <button type="submit" disabled={loading} className={btnClass}>
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-saffron-600 hover:underline">
                                ← Change email
                            </button>
                        </form>
                    )}

                    {/* Step 3: Username + Password */}
                    {step === 3 && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User size={18} className="text-gray-400" />
                                    </div>
                                    <input type="text" required className={inputClass} placeholder="Choose a username"
                                        value={username} onChange={(e) => setUsername(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-400" />
                                    </div>
                                    <input type="password" required className={inputClass} placeholder="Choose a password"
                                        value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className={btnClass}>
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>
                    )}

                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-saffron-600 hover:text-saffron-500">Login here</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
