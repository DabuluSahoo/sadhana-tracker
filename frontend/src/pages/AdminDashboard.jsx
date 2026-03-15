import { useState, useEffect, useContext } from 'react';
import api from '../api';
import { format, subDays } from 'date-fns';
import { ChevronRight, FileText, Download, ChevronDown } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import SadhanaAnalytics from '../components/SadhanaAnalytics';
import { generateWeeklySadhanaReport, generateCustomRangeSadhanaReport, generateGroupReport, getTargetWeek } from '../utils/reportUtils';

const GROUPS = ['yudhisthir', 'bhima', 'arjun', 'nakul', 'sahadev', 'other'];
const GROUP_EMOJI = { yudhisthir: '🔥', bhima: '🏆', arjun: '🪷', nakul: '🌿', sahadev: '🌱', other: '☸️' };
const GROUP_LEVEL = { yudhisthir: 5, bhima: 4, arjun: 3, nakul: 2, sahadev: 1, other: 0 };

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
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [groupReportGroup, setGroupReportGroup] = useState('all');
    const [showCustomRange, setShowCustomRange] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showDevoteeCustom, setShowDevoteeCustom] = useState(false);
    const [devoteeCustomStart, setDevoteeCustomStart] = useState('');
    const [devoteeCustomEnd, setDevoteeCustomEnd] = useState('');
    const [triggeringReport, setTriggeringReport] = useState(false);
    // Release Management states
    const [currentVersion, setCurrentVersion] = useState('');
    const [releaseVersion, setReleaseVersion] = useState('');
    const [releaseFile, setReleaseFile] = useState(null);
    const [uploadingRelease, setUploadingRelease] = useState(false);

    const handleTriggerConsolidatedReport = async () => {
        if (!confirm('Are you sure you want to trigger the weekly consolidated reports for ALL groups right now? \n\nThis will send emails to all Brahmacaris.')) return;
        
        setTriggeringReport(true);
        try {
            await api.post('/admin/trigger-weekly-report');
            alert('✅ Weekly reports have been triggered successfully! They will arrive in the Brahmacaris\' inboxes shortly.');
        } catch (err) {
            console.error('Trigger failed:', err);
            alert('❌ Failed to trigger reports: ' + (err.response?.data?.message || err.message));
        } finally {
            setTriggeringReport(false);
        }
    };

    const handleReleaseUpload = async (e) => {
        e.preventDefault();
        if (!releaseVersion || !releaseFile) return alert('Please provide both version and APK file.');
        
        const formData = new FormData();
        formData.append('version', releaseVersion);
        formData.append('apkFile', releaseFile);

        setUploadingRelease(true);
        try {
            const { data } = await api.post('/settings/upload-release', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('✅ Release uploaded successfully! New version: ' + data.version);
            setReleaseVersion('');
            setReleaseFile(null);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('❌ Upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploadingRelease(false);
        }
    };
    // ... existing code ...
    // (Note: Replace only up to the detail header section)

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/settings');
                if (data.latest_apk_version) setCurrentVersion(data.latest_apk_version);
            } catch (err) {
                console.error("Failed to fetch current version", err);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
            // 1. Try to load from cache first for instant UI
            const cachedData = sessionStorage.getItem('ADMIN_USERS_CACHE');
            if (cachedData) {
                try {
                    setUsers(JSON.parse(cachedData));
                    setLoading(false); // Stop main spinner if we have cached data
                } catch (e) {
                    sessionStorage.removeItem('ADMIN_USERS_CACHE');
                }
            }

            try {
                const { data } = await api.get('/admin/users');
                setUsers(data);
                // 2. Update cache with fresh data
                sessionStorage.setItem('ADMIN_USERS_CACHE', JSON.stringify(data));
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

    const handleGroupChange = async (newGroup) => {
        if (!newGroup || newGroup === selectedUser.group_name) return;
        if (!confirm(`Move ${selectedUser.username} to ${newGroup.charAt(0).toUpperCase() + newGroup.slice(1)} group?`)) return;

        try {
            const { data } = await api.put(`/admin/users/${selectedUser.id}/change-group`, { group_name: newGroup });
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, group_name: data.group_name } : u));
            setSelectedUser(prev => ({ ...prev, group_name: data.group_name }));
            alert(`✅ Moved to ${newGroup} group!`);
        } catch (err) {
            alert('Group change failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleGroupReport = async ({ start, end, restrictionNote }) => {
        try {
            const startStr = format(start, 'yyyy-MM-dd');
            const endStr   = format(end,   'yyyy-MM-dd');
            const { data } = await api.get('/sadhana/group-logs', {
                params: { group: groupReportGroup, startDate: startStr, endDate: endStr }
            });
            const label = groupReportGroup === 'all' ? 'All Groups' : groupReportGroup.charAt(0).toUpperCase() + groupReportGroup.slice(1);
            await generateGroupReport(label, data, startStr, endStr, restrictionNote);
        } catch (err) {
            alert('Failed to fetch group data: ' + (err.response?.data?.message || err.message));
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-4">
        
        {/* Release Management Panel (Owner Only) */}
        {user.role === 'owner' && (
            <div className="bg-orange-50 rounded-xl p-5 mb-8 border border-orange-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                        <span>🚀</span> Release Management
                    </h3>
                    <span className="text-sm font-semibold text-orange-700 bg-orange-200 px-3 py-1 rounded-full">
                        Current Live Version: {currentVersion || 'None Yet'}
                    </span>
                </div>
                <p className="text-sm text-gray-700 mb-4 font-medium leading-relaxed">Upload new APKs to GitHub Releases. This will trigger a new app version for users.</p>
                <form onSubmit={handleReleaseUpload} className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 min-w-[120px]">
                        <label className="block text-xs font-semibold text-blue-800 mb-1">Version Code</label>
                        <input 
                            type="text" 
                            placeholder="e.g. 1.0.5" 
                            value={releaseVersion}
                            onChange={(e) => setReleaseVersion(e.target.value)}
                            className="w-full text-sm border border-blue-300 rounded-lg px-3 py-2 bg-white focus:ring-1 focus:ring-blue-400 focus:outline-none"
                            required
                        />
                    </div>
                    <div className="flex-[2] min-w-[200px]">
                        <label className="block text-xs font-semibold text-blue-800 mb-1">APK File (.apk)</label>
                        <input 
                            type="file" 
                            accept=".apk"
                            onChange={(e) => setReleaseFile(e.target.files[0])}
                            className="w-full text-sm border border-blue-300 rounded-lg px-2 py-1.5 bg-white text-blue-800 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={uploadingRelease}
                        className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md whitespace-nowrap"
                    >
                        {uploadingRelease ? 'Uploading to GitHub...' : 'Upload & Deploy'}
                    </button>
                </form>
            </div>
        )}

        {/* Group Report Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4">
            <div className="flex flex-wrap gap-4 items-end">
                <div>
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">📥 Group Report</p>
                    {(() => {
                        const isOwnerOrBrahmacari = user.role === 'owner' || user.group_name === 'brahmacari';
                        let perms = user.group_permissions;
                        if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch { perms = []; } }
                        const allowedGroups = isOwnerOrBrahmacari ? GROUPS : (Array.isArray(perms) ? perms.filter(g => GROUPS.includes(g)) : []);
                        return (
                            <select
                                aria-label="Group Report Filter"
                                value={groupReportGroup}
                                onChange={e => setGroupReportGroup(e.target.value)}
                                className="text-sm border border-amber-300 rounded-lg px-3 py-1.5 bg-amber-50 text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            >
                                {isOwnerOrBrahmacari ? <option value="all">All Groups</option> : <option value="all">All (My Groups)</option>}
                                {allowedGroups.map(g => <option key={g} value={g}>{GROUP_EMOJI[g]} {g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                            </select>
                        );
                    })()}
                </div>
                {/* Last Week button */}
                <button
                    onClick={() => { const w = getTargetWeek(); handleGroupReport(w); }}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-saffron-600 text-white rounded-lg text-xs font-bold hover:bg-saffron-700 transition-colors shadow-sm"
                >
                    <Download size={13} /> Last Completed Week
                </button>
                {/* Trigger All Weekly Reports (Owner ONLY) */}
                {user.role === 'owner' && (
                    <button
                        onClick={handleTriggerConsolidatedReport}
                        disabled={triggeringReport}
                        className={`flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {triggeringReport ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                        ) : (
                            <span>📧</span>
                        )}
                        {triggeringReport ? 'Sending...' : 'Trigger All Weekly Reports'}
                    </button>
                )}
                {/* Custom Range toggle */}
                <button
                    onClick={() => setShowCustomRange(v => !v)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
                >
                    <Download size={13} /> Custom Range <ChevronDown size={12} className={`transition-transform ${showCustomRange ? 'rotate-180' : ''}`} />
                </button>
                {showCustomRange && (
                    <div className="flex items-end gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <div>
                            <p className="text-[10px] text-amber-700 font-semibold mb-0.5">From</p>
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                                min={format(subDays(new Date(), 30), 'yyyy-MM-dd')}
                                max={format(subDays(new Date(), 1), 'yyyy-MM-dd')}
                                className="text-xs border border-amber-300 rounded px-2 py-1 bg-white" />
                        </div>
                        <div>
                            <p className="text-[10px] text-amber-700 font-semibold mb-0.5">To</p>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                                min={format(subDays(new Date(), 30), 'yyyy-MM-dd')}
                                max={format(subDays(new Date(), 1), 'yyyy-MM-dd')}
                                className="text-xs border border-amber-300 rounded px-2 py-1 bg-white" />
                        </div>
                        <button
                            onClick={() => {
                                if (!customStart || !customEnd) return alert('Please select both dates');
                                handleGroupReport({ start: new Date(customStart), end: new Date(customEnd), restrictionNote: null });
                            }}
                            className="text-xs bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800 font-bold"
                        >Download</button>
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-auto lg:h-[calc(100vh-220px)]">
            {/* Users List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="font-semibold text-gray-700 text-lg">Devotees</h2>
                </div>
                <div className="overflow-hidden flex flex-col flex-grow">
                    {(() => {
                        const owners = user.role === 'owner' ? users.filter(u => u.role === 'owner') : [];
                        const brahmacaris = users.filter(u => u.group_name === 'brahmacari');
                        const grouped = {
                            yudhisthir: users.filter(u => u.role !== 'owner' && u.group_name === 'yudhisthir'),
                            bhima: users.filter(u => u.role !== 'owner' && u.group_name === 'bhima'),
                            arjun: users.filter(u => u.role !== 'owner' && u.group_name === 'arjun'),
                            nakul: users.filter(u => u.role !== 'owner' && u.group_name === 'nakul'),
                            sahadev: users.filter(u => u.role !== 'owner' && u.group_name === 'sahadev'),
                            other: users.filter(u => u.role !== 'owner' && u.group_name === 'other'),
                        };
                        const unassigned = users.filter(u => u.role !== 'owner' && !u.group_name && u.group_name !== 'brahmacari');

                        const sectionStyles = {
                            yudhisthir: { header: 'bg-orange-50 border-orange-200 text-orange-800', dot: 'bg-orange-500' },
                            bhima:      { header: 'bg-amber-50 border-amber-200 text-amber-800',   dot: 'bg-amber-400' },
                            arjun:      { header: 'bg-saffron-50 border-saffron-200 text-saffron-800', dot: 'bg-saffron-400' },
                            nakul:      { header: 'bg-teal-50 border-teal-200 text-teal-800',     dot: 'bg-teal-400' },
                            sahadev:    { header: 'bg-emerald-50 border-emerald-200 text-emerald-800', dot: 'bg-emerald-400' },
                            other:      { header: 'bg-gray-100 border-gray-300 text-gray-700',      dot: 'bg-gray-400' },
                        };

                        const renderUser = (devotee) => (
                            <button
                                key={devotee.id}
                                onClick={() => { handleUserSelect(devotee.id); setShowPermPanel(false); setRenaming(false); }}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-saffron-50 transition-colors flex justify-between items-center ${selectedUser?.id === devotee.id ? 'bg-saffron-50 border-saffron-200' : ''}`}
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{devotee.username}</p>
                                    <p className="text-xs text-gray-500">{devotee.email || <span className="text-red-400">No Email</span>}</p>
                                    <p className={`text-[10px] uppercase font-bold tracking-tighter ${
                                        devotee.role === 'owner' ? 'text-purple-700' : devotee.role === 'admin' ? 'text-saffron-700' : 'text-gray-500'
                                    }`}>{devotee.role}</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-500" />
                            </button>
                        );

                        return (
                            <>
                                {/* Owner — always pinned at top */}
                                {owners.length > 0 && owners.map(renderUser)}

                                {/* Brahmacari section — pinned below owner */}
                                {brahmacaris.length > 0 && (
                                    <div>
                                        <button
                                            onClick={() => setExpandedGroup(prev => prev === 'brahmacari' ? null : 'brahmacari')}
                                            className="w-full px-4 py-1.5 border-y flex items-center gap-2 sticky top-0 z-10 bg-amber-50 border-amber-200 text-amber-800 cursor-pointer"
                                        >
                                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                                            <span className="text-xs font-bold uppercase tracking-wider">🕉️ Brahmacari</span>
                                            <span className="ml-auto text-xs text-amber-700 font-semibold mr-1">{brahmacaris.length}</span>
                                            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedGroup === 'brahmacari' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {expandedGroup === 'brahmacari' && <div className="overflow-y-auto max-h-56">{brahmacaris.map(renderUser)}</div>}
                                    </div>
                                )}

                                {['yudhisthir', 'bhima', 'arjun', 'nakul', 'sahadev', 'other'].map(g => grouped[g].length > 0 && (
                                    <div key={g}>
                                        <button
                                            onClick={() => setExpandedGroup(prev => prev === g ? null : g)}
                                            className={`w-full px-4 py-1.5 border-y flex items-center gap-2 sticky top-0 z-10 cursor-pointer ${sectionStyles[g].header}`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${sectionStyles[g].dot}`} />
                                            <span className="text-xs font-bold uppercase tracking-wider capitalize">{GROUP_EMOJI[g]} {g} Group</span>
                                            <span className="ml-auto text-xs font-semibold mr-1">{grouped[g].length}</span>
                                            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedGroup === g ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {expandedGroup === g && <div className="overflow-y-auto max-h-56">{grouped[g].map(renderUser)}</div>}
                                    </div>
                                ))}

                                {unassigned.length > 0 && (
                                    <div>
                                        <button
                                            onClick={() => setExpandedGroup(prev => prev === 'unassigned' ? null : 'unassigned')}
                                            className="w-full px-4 py-1.5 border-y flex items-center gap-2 sticky top-0 z-10 bg-gray-50 border-gray-200 text-gray-500 cursor-pointer"
                                        >
                                            <span className="w-2 h-2 rounded-full bg-gray-300" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Unassigned</span>
                                            <span className="ml-auto text-xs font-semibold mr-1">{unassigned.length}</span>
                                            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedGroup === 'unassigned' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {expandedGroup === 'unassigned' && <div className="overflow-y-auto max-h-56">{unassigned.map(renderUser)}</div>}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>

            </div>

            {/* User Logs Detail */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                {selectedUser ? (
                    <>
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                                            <h2 className="font-semibold text-gray-700 text-lg">Records for {selectedUser.username}</h2>
                                            {user.role === 'owner' && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => { setNewUsername(selectedUser.username); setRenaming(true); }}
                                                        title="Rename user"
                                                        className="text-gray-400 hover:text-saffron-600 transition-colors"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <div className="relative group">
                                                        <select
                                                            aria-label="Change Group"
                                                            value={selectedUser.group_name || ''}
                                                            onChange={(e) => handleGroupChange(e.target.value)}
                                                            className="text-[10px] appearance-none bg-white border border-gray-200 rounded px-2 py-0.5 pr-4 text-gray-500 hover:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-500 cursor-pointer"
                                                            title="Change sadhana group"
                                                        >
                                                            <option value="" disabled>Change Group</option>
                                                            {GROUPS.map(g => (
                                                                <option key={g} value={g}>{GROUP_EMOJI[g]} {g}</option>
                                                            ))}
                                                            <option value="brahmacari">🕉️ brahmacari</option>
                                                        </select>
                                                        <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 items-center">
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
                                                    {selectedUser.group_name === 'brahmacari' ? (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await api.put(`/admin/users/${selectedUser.id}/revoke-brahmacari`);
                                                                    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, group_name: null } : u));
                                                                    setSelectedUser(prev => ({ ...prev, group_name: null }));
                                                                    alert(`✅ Brahmacari status revoked for ${selectedUser.username}`);
                                                                } catch (err) { alert(err.response?.data?.message || err.message); }
                                                            }}
                                                            className="flex items-center px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors shadow-sm text-xs font-medium"
                                                        >
                                                            🕉️ Revoke Brahmacari
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm(`Assign ${selectedUser.username} as Brahmacari? They will have admin powers but no sadhana entry.`)) return;
                                                                    try {
                                                                        await api.put(`/admin/users/${selectedUser.id}/assign-brahmacari`);
                                                                        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, group_name: 'brahmacari', role: 'admin' } : u));
                                                                        setSelectedUser(prev => ({ ...prev, group_name: 'brahmacari', role: 'admin' }));
                                                                        alert(`✅ ${selectedUser.username} is now a Brahmacari`);
                                                                    } catch (err) { alert(err.response?.data?.message || err.message); }
                                                                }}
                                                                className="flex items-center px-3 py-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors shadow-sm text-xs font-medium"
                                                            >
                                                                🕉️ Assign Brahmacari
                                                            </button>
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
                                                    )}
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
                                
                                {/* Download Buttons as a flex row to avoid height issues */}
                                <div className="flex gap-2 ml-auto">
                                    <button
                                        onClick={async () => await generateWeeklySadhanaReport(selectedUser.username, userLogs)}
                                        className="flex items-center px-3 py-1.5 bg-saffron-600 text-white rounded-md hover:bg-saffron-700 transition-colors shadow-sm text-xs font-medium whitespace-nowrap"
                                    >
                                        <FileText size={13} className="mr-1.5" />
                                        Last Week
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowDevoteeCustom(v => !v)}
                                            className="flex items-center px-3 py-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors shadow-sm text-xs font-medium whitespace-nowrap"
                                        >
                                            <FileText size={13} className="mr-1.5" />
                                            Custom Range
                                        </button>
                                        {showDevoteeCustom && (
                                            <div className="absolute right-0 top-full mt-2 z-[50] flex flex-col gap-1 p-2 bg-amber-50 border border-amber-200 rounded-md shadow-lg min-w-[200px]">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[10px] text-amber-700 font-bold px-1">Start Date</p>
                                                    <input type="date" value={devoteeCustomStart} onChange={e => setDevoteeCustomStart(e.target.value)}
                                                        min={format(subDays(new Date(), 30), 'yyyy-MM-dd')}
                                                        max={format(subDays(new Date(), 1), 'yyyy-MM-dd')}
                                                        className="text-xs border border-gray-300 rounded px-1 py-1" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[10px] text-amber-700 font-bold px-1">End Date</p>
                                                    <input type="date" value={devoteeCustomEnd} onChange={e => setDevoteeCustomEnd(e.target.value)}
                                                        min={format(subDays(new Date(), 30), 'yyyy-MM-dd')}
                                                        max={format(subDays(new Date(), 1), 'yyyy-MM-dd')}
                                                        className="text-xs border border-gray-300 rounded px-1 py-1" />
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (!devoteeCustomStart || !devoteeCustomEnd) return alert('Please select both dates');
                                                        await generateCustomRangeSadhanaReport(selectedUser.username, userLogs, devoteeCustomStart, devoteeCustomEnd);
                                                        setShowDevoteeCustom(false);
                                                    }}
                                                    className="mt-1 text-xs bg-amber-600 text-white rounded px-2 py-1.5 hover:bg-amber-700 font-bold"
                                                >Download Report</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Group Permissions Panel (owner only, admin selected) */}
                        {showPermPanel && user.role === 'owner' && selectedUser?.role === 'admin' && (
                            <div className="mx-6 mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                <h4 className="font-semibold text-purple-800 mb-3">🔑 Group Access for <em>{selectedUser.username}</em></h4>
                                <p className="text-xs text-purple-600 mb-3">Select which groups this admin can view data for:</p>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {GROUPS.filter(g => g !== 'other').map(g => (
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
                                        <h3 className="font-serif font-bold text-gray-700 mb-4 text-lg">Detailed History</h3>
                                        <div className="space-y-4">
                                            {userLogs.map(log => (
                                                <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-medium text-saffron-700">{format(new Date(log.date), 'EEEE, MMM d, yyyy')}</h4>
                                                        <span className="text-xs text-gray-500">Submitted: {format(new Date(log.created_at), 'MMM d, p')}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mt-3">
                                                        <div><span className="text-gray-500">Rounds:</span> <span className="font-medium">{log.rounds}</span> {log.japa_completed_time && <span className="text-xs text-gray-400 ml-1">({log.japa_completed_time})</span>}</div>
                                                        <div><span className="text-gray-500">NRCM:</span> <span className="font-medium">{log.nrcm || 0}</span></div>
                                                        <div className="col-span-2"><span className="text-gray-500">Reading:</span> <span className="font-medium">{log.reading_time}m</span> {log.reading_details && <span className="text-gray-400 text-xs ml-1">({log.reading_details})</span>}</div>
                                                        <div className="col-span-2"><span className="text-gray-500">Hearing:</span> <span className="font-medium">{log.hearing_time}m</span> {log.hearing_details && <span className="text-gray-400 text-xs ml-1">({log.hearing_details})</span>}</div>
                                                        <div><span className="text-gray-500">Service:</span> <span className="font-medium">{log.service_hours}h</span></div>
                                                        <div><span className="text-gray-500">Study:</span> <span className="font-medium">{log.study_time}m</span></div>
                                                        <div><span className="text-gray-500">Wake:</span> <span className="font-medium">{log.wakeup_time}</span></div>
                                                        <div><span className="text-gray-500">Sleep:</span> <span className="font-medium">{log.sleep_time}</span></div>
                                                        <div><span className="text-gray-500">Rest:</span> <span className="font-medium">{log.dayrest_time || 0}m</span></div>
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
        </div>
    );
};

export default AdminDashboard;
