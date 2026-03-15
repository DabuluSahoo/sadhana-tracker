import { useContext, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { LogOut, LayoutDashboard, History as HistoryIcon, Users, Menu, X, Lock } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { isNative } from '../utils/platform';

const Layout = () => {
    const { user, logout, biometricEnabled, toggleBiometric } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const noSadhana = user?.role === 'owner' || ['brahmacari', 'other', 'yudhisthir'].includes(user?.group_name);

    const navItems = [
        { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { label: 'History', path: '/history', icon: <HistoryIcon size={20} />, hidden: noSadhana },
        {
            label: user?.role === 'owner' ? 'Owner' : 'Admin',
            path: '/admin',
            roles: ['admin', 'owner'],
            icon: <Users size={20} />
        },
    ].filter(item => !item.roles || item.roles.includes(user?.role)).filter(item => !item.hidden);

    return (
        <div className="min-h-screen bg-devotional-bg flex flex-col">
            {/* Navbar */}
            <nav 
                className="bg-saffron-700 text-white shadow-md sticky top-0 z-50"
                style={{ paddingTop: isNative() ? 'max(env(safe-area-inset-top), 36px)' : '0px' }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center">
                            <h1 className="text-xl font-serif font-bold tracking-wide">Sadhana Tracker</h1>
                        </div>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center space-x-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${location.pathname === item.path ? 'bg-saffron-800' : 'hover:bg-saffron-600'
                                        }`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                            <div className="flex items-center space-x-3">
                                {user?.role === 'owner' && <NotificationCenter />}
                                <span className="font-medium">{user?.username}</span>
                                {isNative() && (
                                    <button
                                        onClick={toggleBiometric}
                                        className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors ${biometricEnabled ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-saffron-800 text-gray-200'}`}
                                        title="Toggle Biometric App Lock"
                                    >
                                        <Lock size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-1 hover:bg-saffron-800 px-3 py-2 rounded-md transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center space-x-2">
                            <span className="text-sm font-semibold mr-1 text-saffron-100">{user?.username}</span>
                            {user?.role === 'owner' && <NotificationCenter />}
                            <button
                                aria-label="Toggle Mobile Menu"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 rounded-md hover:bg-saffron-800 focus:outline-none"
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Nav */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-saffron-800 px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <div className="px-3 py-2 border-b border-saffron-700/50 mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-saffron-200 uppercase tracking-wider">Logged in as</span>
                            <span className="font-bold text-white">{user?.username}</span>
                        </div>
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center space-x-2 block px-3 py-2 rounded-md text-base font-medium ${location.pathname === item.path ? 'bg-saffron-900' : 'hover:bg-saffron-700'
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        ))}
                        {isNative() && (
                            <button
                                onClick={() => {
                                    toggleBiometric();
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`flex items-center space-x-2 w-full text-left px-3 py-2 rounded-md text-base font-medium ${biometricEnabled ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-saffron-700'}`}
                            >
                                <Lock size={20} />
                                <span>{biometricEnabled ? 'App Lock On' : 'App Lock Off'}</span>
                            </button>
                        )}
                        <button
                            onClick={() => {
                                handleLogout();
                                setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center space-x-2 w-full text-left px-3 py-2 rounded-md hover:bg-saffron-700 text-base font-medium"
                        >
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} ISKCON Sadhana Tracker. Chant Hare Krishna and be happy!
                </div>
            </footer>
        </div>
    );
};

export default Layout;
