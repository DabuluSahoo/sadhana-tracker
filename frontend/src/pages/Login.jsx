import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { Lock, User } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(username, password);
        if (success) navigate('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-saffron-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden md:max-w-lg border border-saffron-100">
                <div className="bg-saffron-600 py-6 px-8 text-center">
                    <h2 className="text-2xl font-serif font-bold text-white">Sadhana Tracker</h2>
                    <p className="text-saffron-100 mt-2">Sign in to your account</p>
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

                    <button
                        type="submit"
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-saffron-600 hover:bg-saffron-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron-500 transition-colors"
                    >
                        Sign In
                    </button>

                    <div className="text-center mt-4">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-medium text-saffron-600 hover:text-saffron-500">
                                Register here
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
