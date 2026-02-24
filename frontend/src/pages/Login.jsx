import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { Lock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showGreeting, setShowGreeting] = useState(true);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowGreeting(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const success = await login(username, password);
        setLoading(false);
        if (success) navigate('/');
        else setError('Invalid username or password. Please try again.');
    };

    return (
        <AnimatePresence mode="wait">
            {showGreeting ? (
                <motion.div
                    key="greeting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
                    transition={{ duration: 0.8 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-saffron-600 text-white overflow-hidden"
                >
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="mb-8"
                    >
                        <img src="/voice_logo.svg" alt="VOICE Logo" className="w-32 h-32 md:w-48 md:h-48" style={{ filter: 'brightness(0) invert(1)' }} />
                    </motion.div>
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="text-5xl md:text-8xl font-serif font-bold tracking-[0.2em] italic text-center px-4"
                    >
                        HARE KRISHNA
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.8 }}
                        transition={{ delay: 1, duration: 1 }}
                        className="mt-6 text-xl md:text-2xl font-serif italic tracking-widest"
                    >
                        Welcome to Sadhana Tracker
                    </motion.p>
                </motion.div>
            ) : (
                <motion.div
                    key="login-page"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="min-h-screen flex items-center justify-center bg-saffron-50 px-4"
                >
                    <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden md:max-w-lg border border-saffron-100">
                        <div className="bg-saffron-600 py-6 px-8 text-center flex flex-col items-center">
                            <img src="/voice_logo.svg" alt="VOICE Logo" className="w-20 h-20 mb-3" style={{ filter: 'brightness(0) invert(1)' }} />
                            <h1 className="text-3xl font-serif font-bold text-white tracking-widest mb-1 italic">HARE KRISHNA</h1>
                            <h2 className="text-xl font-serif font-semibold text-saffron-100">Sadhana Tracker</h2>
                            <p className="text-saffron-200 mt-2 text-sm italic">Sign in to your account</p>
                        </div>

                        <form onSubmit={handleSubmit} className="py-8 px-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User size={18} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            className="pl-10 block w-full border border-gray-300 rounded-md py-2 focus:ring-saffron-500 focus:border-saffron-500 transition-colors"
                                            placeholder="Enter your username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock size={18} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            className="pl-10 block w-full border border-gray-300 rounded-md py-2 focus:ring-saffron-500 focus:border-saffron-500 transition-colors"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md py-2 px-3">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-saffron-600 hover:bg-saffron-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>

                            <div className="text-center mt-2">
                                <Link to="/forgot-password" className="text-sm text-saffron-600 hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>

                            <div className="text-center mt-2">
                                <p className="text-sm text-gray-600">
                                    Don't have an account?{' '}
                                    <Link to="/register" className="font-medium text-saffron-600 hover:text-saffron-500">
                                        Register here
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Login;
