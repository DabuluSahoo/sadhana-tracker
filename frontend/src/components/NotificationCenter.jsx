import { useState, useEffect } from 'react';
import { Bell, Check, X, UserPlus, Clock } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

const NotificationCenter = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/pending-approvals');
      setPendingUsers(data);
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    // Poll every 2 minutes for new registrations
    const interval = setInterval(fetchPending, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (userId, approve) => {
    try {
      if (approve) {
        await api.put(`/admin/users/${userId}/approve-manual`);
        toast.success('Account approved!');
      } else {
        await api.delete(`/admin/users/${userId}`);
        toast.success('Registration rejected.');
      }
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      toast.error('Action failed: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-saffron-600 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell size={24} />
        {pendingUsers.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {pendingUsers.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute -right-2 sm:right-0 mt-2 w-[calc(100vw-2rem)] max-w-[300px] sm:max-w-none sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Bell size={18} className="text-saffron-600" />
                Registrations
              </h3>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {pendingUsers.length} Pending
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loading && pendingUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
              ) : pendingUsers.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="text-4xl mb-3">🕉️</div>
                  <p className="text-gray-500 text-sm font-medium">All caught up!</p>
                  <p className="text-gray-400 text-xs mt-1">No new registration requests.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-amber-50/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-2 bg-saffron-100 text-saffron-600 rounded-full">
                          <UserPlus size={16} />
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-gray-800">{user.username}</h4>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock size={10} />
                              {format(new Date(user.created_at), 'MMM d, p')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                          <div className="mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-bold uppercase tracking-tighter">
                              Group: {user.group_name}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleAction(user.id, true)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 bg-saffron-600 text-white text-xs font-bold rounded-lg hover:bg-saffron-700 transition-colors shadow-sm"
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleAction(user.id, false)}
                              className="flex items-center justify-center p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Reject"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="w-full block p-3 bg-amber-50 hover:bg-amber-100 border-t border-amber-200 text-center text-[10px] sm:text-xs font-bold text-amber-800 transition-colors uppercase tracking-widest"
            >
              Close Panel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
