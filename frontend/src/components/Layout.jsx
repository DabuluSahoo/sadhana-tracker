import { useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { LogOut, LayoutDashboard, History, Users, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { label: 'History', path: '/history', icon: <History size={20} /> },
        { label: 'Calendar', path: '/calendar', icon: <Calendar size={20} /> },
        ...(user?.role === 'admin' ? [{ label: 'Admin', path: '/admin', icon: <Users size={20} /> }] : []),
    ];

    return (
        <div className="min-h-screen bg-devotional-bg flex flex-col">
            {/* Navbar */}
            <nav className="bg-saffron-600 text-white shadow-md">
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
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${location.pathname === item.path ? 'bg-saffron-700' : 'hover:bg-saffron-500'
                                        }`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                            <div className="border-l border-saffron-400 h-6 mx-2"></div>
                            <div className="flex items-center space-x-3">
                                <span className="font-medium">{user?.username}</span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-1 hover:bg-saffron-700 px-3 py-2 rounded-md transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 rounded-md hover:bg-saffron-700 focus:outline-none"
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Nav */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-saffron-700 px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center space-x-2 block px-3 py-2 rounded-md text-base font-medium ${location.pathname === item.path ? 'bg-saffron-800' : 'hover:bg-saffron-600'
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        ))}
                        <button
                            onClick={() => {
                                handleLogout();
                                setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center space-x-2 w-full text-left px-3 py-2 rounded-md hover:bg-saffron-600 text-base font-medium"
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
