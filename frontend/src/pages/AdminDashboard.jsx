import { useState, useEffect, useContext } from 'react';
import api from '../api';
import { format } from 'date-fns';
import { ChevronRight, FileText } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import SadhanaAnalytics from '../components/SadhanaAnalytics';
import { generateWeeklySadhanaReport } from '../utils/reportUtils';

const GROUPS = ['bhima', 'arjun', 'nakul', 'sahadev'];
const GROUP_EMOJI = { bhima: '🏆', arjun: '🪷', nakul: '🌿', sahadev: '🌱' };
const GROUP_LEVEL = { bhima: 4, arjun: 3, nakul: 2, sahadev: 1 };

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userLogs, setUserLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [showPermPanel, setShowPermPanel] = useState(false);
    const [permSelections, setPermSelections] = useState([]);
    const [savingPerms, setSavingPerms] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [newUsername, setNewUsername] = useState('');
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
        if (!confirm(`Are you sure you want to promote ${selectedUser.username} to Admin?`)) return;

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

    // Open the permission panel pre-filled with existing permissions
    const openPermPanel = (targetUser) => {
        let existing = targetUser.group_permissions;
        if (typeof existing === 'string') { try { existing = JSON.parse(existing); } catch { existing = []; } }
        setPermSelections(Array.isArray(existing) ? existing : []);
        setShowPermPanel(true);
    };

    const togglePerm = (g) => setPermSelections(prev =>
        prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );

    const savePermissions = async () => {
        setSavingPerms(true);
        try {
            await api.put(`/admin/users/${selectedUser.id}/group-permissions`, { group_permissions: permSelections });
            setUsers(prev => prev.map(u =>
                u.id === selectedUser.id ? { ...u, group_permissions: permSelections } : u
            ));
            setSelectedUser(prev => ({ ...prev, group_permissions: permSelections }));
            setShowPermPanel(false);
            alert(`✅ Group permissions updated for ${selectedUser.username}`);
        } catch (err) {
            alert('Failed: ' + (err.response?.data?.message || err.message));
        }
        setSavingPerms(false);
    };

    const handleRename = async () => {
        if (!newUsername.trim()) return;
        try {
            await api.put(`/admin/users/${selectedUser.id}/rename`, { username: newUsername.trim() });
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, username: newUsername.trim() } : u));
            setSelectedUser(prev => ({ ...prev, username: newUsername.trim() }));
            setRenaming(false);
        } catch (err) {
            alert('Rename failed: ' + (err.response?.data?.message || err.message));
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
                    {users.map(devotee => (
                        <button
                            key={devotee.id}
                            onClick={() => { handleUserSelect(devotee.id); setShowPermPanel(false); setRenaming(false); }}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-saffron-50 transition-colors flex justify-between items-center ${selectedUser?.id === devotee.id ? 'bg-saffron-50 border-saffron-200' : ''}`}
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-800">
                                    {devotee.username}
                                    {devotee.group_name && (
                                        <span className="text-gray-400 font-normal capitalize"> ({devotee.group_name})</span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-500">{devotee.email || <span className="text-red-400">No Email</span>}</p>
                                <p className={`text-[10px] uppercase font-bold tracking-tighter ${
                                    devotee.role === 'owner' ? 'text-purple-600' : devotee.role === 'admin' ? 'text-saffron-600' : 'text-gray-400'
                                }`}>{devotee.role}</p>
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
                            <div className="flex items-center gap-2">
                                {renaming ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            value={newUsername}
                                            onChange={e => setNewUsername(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                                            className="border border-saffron-400 rounded px-2 py-1 text-sm font-semibold text-gray-700 w-44 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                                        />
                                        <button onClick={handleRename} className="text-xs px-2 py-1 bg-saffron-500 text-white rounded hover:bg-saffron-600">Save</button>
                                        <button onClick={() => setRenaming(false)} className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">Cancel</button>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="font-semibold text-gray-700">Records for {selectedUser.username}</h3>
                                        {user.role === 'owner' && (
                                            <button
                                                onClick={() => { setNewUsername(selectedUser.username); setRenaming(true); }}
                                                title="Rename user"
                                                className="text-gray-400 hover:text-saffron-600 transition-colors"
                                            >
                                                ✏️
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
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
                                                <>
                                                    <button
                                                        onClick={() => openPermPanel(selectedUser)}
                                                        className="flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-sm text-xs font-medium"
                                                    >
                                                        🔑 Group Access
                                                    </button>
                                                    <button
                                                        onClick={() => handleDemote(selectedUser.id)}
                                                        className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm text-xs font-medium"
                                                    >
                                                        Demote to Devotee
                                                    </button>
                                                </>
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

                        {/* Group Permissions Panel (owner only, admin selected) */}
                        {showPermPanel && user.role === 'owner' && selectedUser?.role === 'admin' && (
                            <div className="mx-6 mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                <h4 className="font-semibold text-purple-800 mb-3">🔑 Group Access for <em>{selectedUser.username}</em></h4>
                                <p className="text-xs text-purple-600 mb-3">Select which groups this admin can view data for:</p>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {GROUPS.map(g => (
                                        <label key={g} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                            permSelections.includes(g)
                                                ? 'border-purple-400 bg-purple-100'
                                                : 'border-gray-200 bg-white hover:border-purple-200'
                                        }`}>
                                            <input
                                                type="checkbox"
                                                checked={permSelections.includes(g)}
                                                onChange={() => togglePerm(g)}
                                                className="accent-purple-600 w-4 h-4"
                                            />
                                            <span className="text-sm font-medium capitalize">{GROUP_EMOJI[g]} {g} <span className="text-xs text-gray-400">(Lv{GROUP_LEVEL[g]})</span></span>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={savePermissions}
                                        disabled={savingPerms}
                                        className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-60"
                                    >
                                        {savingPerms ? 'Saving...' : 'Save Permissions'}
                                    </button>
                                    <button
                                        onClick={() => setShowPermPanel(false)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

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
