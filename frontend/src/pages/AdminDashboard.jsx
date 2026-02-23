import { useState, useEffect, useContext } from 'react';
import api from '../api';
import { format } from 'date-fns';
import { ChevronRight, FileText } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import SadhanaAnalytics from '../components/SadhanaAnalytics';
import { generateWeeklySadhanaReport } from '../utils/reportUtils';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userLogs, setUserLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    // ... existing code ...
    // (Note: Replace only up to the detail header section)

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data } = await api.get('/admin/users');
                setUsers(data);
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const fetchUserLogs = async (userId, pageNum = 1) => {
        if (loadingLogs) return;
        setLoadingLogs(true);
        try {
            const { data } = await api.get(`/admin/users/${userId}/logs?page=${pageNum}&limit=30`);

            if (pageNum === 1) {
                setUserLogs(data.logs);
            } else {
                setUserLogs(prev => [...prev, ...data.logs]);
            }

            setHasMore(data.pagination.currentPage < data.pagination.totalPages);
            setPage(pageNum);

            if (!selectedUser || selectedUser.id !== userId) {
                setSelectedUser(users.find(u => u.id === userId));
            }
        } catch (error) {
            console.error('Error fetching user logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleUserSelect = (userId) => {
        setPage(1);
        setHasMore(true);
        setUserLogs([]);
        setSelectedUser(users.find(u => u.id === userId));
        fetchUserLogs(userId, 1);
    };

    const loadMoreLogs = () => {
        if (hasMore && !loadingLogs && selectedUser) {
            fetchUserLogs(selectedUser.id, page + 1);
        }
    };

    const handlePromote = async (userId) => {
        if (!confirm(`Are you sure you want to promote ${selectedUser.username} to Admin? This action cannot be easily undone.`)) return;

        try {
            await api.put(`/admin/users/${userId}/promote`);
            // Update local users state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'admin' } : u));
            setSelectedUser(prev => ({ ...prev, role: 'admin' }));
            alert('User promoted successfully!');
        } catch (err) {
            alert('Failed to promote user: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDemote = async (userId) => {
        if (userId === user.id) return alert('You cannot demote yourself!');
        if (!confirm(`Are you sure you want to demote ${selectedUser.username} back to Devotee?`)) return;

        try {
            await api.put(`/admin/users/${userId}/demote`);
            // Update local users state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'devotee' } : u));
            setSelectedUser(prev => ({ ...prev, role: 'devotee' }));
            alert('User demoted successfully!');
        } catch (err) {
            alert('Failed to demote user: ' + (err.response?.data?.message || err.message));
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
            {/* Users List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Devotees</h3>
                </div>
                <div className="overflow-y-auto flex-grow">
                    {users.map(user => (
                        <button
                            key={user.id}
                            onClick={() => handleUserSelect(user.id)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-saffron-50 transition-colors flex justify-between items-center ${selectedUser?.id === user.id ? 'bg-saffron-50 border-saffron-200' : ''
                                }`}
                        >
                            <div>
                                <p className="font-medium text-gray-800">{user.username}</p>
                                <p className="text-xs text-gray-500">{user.email || <span className="text-red-400">No Email</span>}</p>
                                <p className={`text-[10px] uppercase font-bold tracking-tighter ${user.role === 'owner' ? 'text-purple-600' : user.role === 'admin' ? 'text-saffron-600' : 'text-gray-400'
                                    }`}>
                                    {user.role}
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-gray-400" />
                        </button>
                    ))}
                </div>
            </div>

            {/* User Logs Detail */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                {selectedUser ? (
                    <>
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700">Records for {selectedUser.username}</h3>
                            <div className="flex space-x-2">
                                {user.role === 'owner' && (
                                    <>
                                        {selectedUser.role !== 'admin' && selectedUser.role !== 'owner' ? (
                                            <button
                                                onClick={() => handlePromote(selectedUser.id)}
                                                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-xs font-medium"
                                            >
                                                Promote to Admin
                                            </button>
                                        ) : (
                                            selectedUser.id !== user.id && selectedUser.role === 'admin' && (
                                                <button
                                                    onClick={() => handleDemote(selectedUser.id)}
                                                    className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm text-xs font-medium"
                                                >
                                                    Demote to Devotee
                                                </button>
                                            )
                                        )}
                                    </>
                                )}
                                <button
                                    onClick={async () => {
                                        if (confirm('Send test reminders for yesterday to all missing users?')) {
                                            try {
                                                const { data } = await api.post('/debug/trigger-reminder');
                                                alert(`Sent: ${data.totalFound} reminders. Check console for details.`);
                                                console.log('Reminder results:', data);
                                            } catch (err) {
                                                alert('Failed to trigger: ' + (err.response?.data?.message || err.message));
                                            }
                                        }
                                    }}
                                    className="flex items-center px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors shadow-sm text-xs font-medium"
                                >
                                    Test Reminders
                                </button>
                                <button
                                    onClick={() => generateWeeklySadhanaReport(selectedUser.username, userLogs)}
                                    className="flex items-center px-3 py-1.5 bg-saffron-600 text-white rounded-md hover:bg-saffron-700 transition-colors shadow-sm text-xs font-medium"
                                >
                                    <FileText size={14} className="mr-1.5" />
                                    Download PDF Report
                                </button>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-grow p-6 space-y-8">
                            {userLogs.length > 0 ? (
                                <>
                                    <SadhanaAnalytics logs={userLogs} />
                                    <div className="pt-6 border-t border-gray-100">
                                        <h4 className="font-serif font-bold text-gray-700 mb-4 text-lg">Detailed History</h4>
                                        <div className="space-y-4">
                                            {userLogs.map(log => (
                                                <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-medium text-saffron-700">{format(new Date(log.date), 'EEEE, MMM d, yyyy')}</h4>
                                                        <span className="text-xs text-gray-500">Submitted: {format(new Date(log.created_at), 'MMM d, p')}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div><span className="text-gray-500">Rounds:</span> <span className="font-medium">{log.rounds}</span></div>
                                                        <div><span className="text-gray-500">Reading:</span> <span className="font-medium">{log.reading_time}m</span></div>
                                                        <div><span className="text-gray-500">Hearing:</span> <span className="font-medium">{log.hearing_time}m</span></div>
                                                        <div><span className="text-gray-500">Service:</span> <span className="font-medium">{log.service_hours}h</span></div>
                                                        <div><span className="text-gray-500">Wake:</span> <span className="font-medium">{log.wakeup_time}</span></div>
                                                        <div><span className="text-gray-500">Sleep:</span> <span className="font-medium">{log.sleep_time}</span></div>
                                                    </div>
                                                    {log.comments && (
                                                        <div className="mt-2 bg-gray-50 p-2 rounded text-sm text-gray-600 italic">
                                                            "{log.comments}"
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {hasMore && (
                                                <button
                                                    onClick={loadMoreLogs}
                                                    disabled={loadingLogs}
                                                    className="w-full py-3 mt-4 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex justify-center items-center"
                                                >
                                                    {loadingLogs ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent mr-2"></div>
                                                            Loading more history...
                                                        </>
                                                    ) : (
                                                        "Load Earlier History"
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10 text-gray-500">No records found for this devotee.</div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Select a devotee to view their reports
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
