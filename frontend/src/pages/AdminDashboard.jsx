import { useState, useEffect } from 'react';
import api from '../api';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SadhanaAnalytics from '../components/SadhanaAnalytics';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userLogs, setUserLogs] = useState([]);
    const [loading, setLoading] = useState(true);

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

    const fetchUserLogs = async (userId) => {
        try {
            const { data } = await api.get(`/admin/users/${userId}/logs`);
            setUserLogs(data);
            setSelectedUser(users.find(u => u.id === userId));
        } catch (error) {
            console.error('Error fetching user logs:', error);
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
                            onClick={() => fetchUserLogs(user.id)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-saffron-50 transition-colors flex justify-between items-center ${selectedUser?.id === user.id ? 'bg-saffron-50 border-saffron-200' : ''
                                }`}
                        >
                            <div>
                                <p className="font-medium text-gray-800">{user.username}</p>
                                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
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
                                        </div>
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
