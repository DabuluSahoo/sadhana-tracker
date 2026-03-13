import { useEffect, useContext, lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AuthContext from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import GroupSelectModal from './components/GroupSelectModal';
import LoadingSpinner from './components/LoadingSpinner';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const History = lazy(() => import('./pages/History'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { isNative } from './utils/platform';
import api from './api';

// Inner component so it can use AuthContext
function AppRoutes() {
  const { user, updateUser } = useContext(AuthContext);
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  // Version Check Logic
  useEffect(() => {
    const checkUpdate = async () => {
      if (!isNative()) return;
      try {
        const { data } = await api.get('/settings');
        if (data && data.latest_apk_version && data.apk_download_url) {
          const info = await CapacitorApp.getInfo();
          
          // Cleanup version strings to standard numbers e.g. "1.0.0" -> "1.0.0"
          const currentStr = info.version.replace(/[^\d.]/g, '');
          const latestStr = data.latest_apk_version.replace(/[^\d.]/g, '');
          
          // Compare versions mathematically
          const isLatestGreater = latestStr.localeCompare(currentStr, undefined, { numeric: true, sensitivity: 'base' }) > 0;
          
          if (isLatestGreater && !updateDismissed) {
            setUpdateAvailable({ version: latestStr, url: data.apk_download_url });
          }
        }
      } catch (err) {
        console.error('Update check failed:', err);
      }
    };
    checkUpdate();
  }, [updateDismissed]);

  // Push Notifications Logic
  useEffect(() => {
    if (user && isNative()) {
      const setupPush = async () => {
        try {
          // Request permissions
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive !== 'granted') {
            permStatus = await PushNotifications.requestPermissions();
          }

          if (permStatus.receive === 'granted') {
            // CRITICAL: Handle listeners BEFORE registering to avoid race conditions
            
            // Handle successful registration
            await PushNotifications.addListener('registration', async (token) => {
              console.log('Push registration success');
              try {
                await api.post('/auth/register-device', { deviceToken: token.value });
                // Quiet success for now, logic is solid
              } catch (err) {
                console.error('Failed to register device token with backend:', err);
                toast.error('Notification system sync failed');
              }
            });

            // Handle registration errors
            await PushNotifications.addListener('registrationError', (error) => {
              console.error('Push registration error: ', error);
              toast.error('Mobile Notification setup failed');
            });

            // Handle received notifications while app is in foreground or silent data messages
            await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
              console.log('Push received: ', notification);
              
              const { data } = notification;
              
              // 🪷 Sticky Reminder Logic
              if (data && data.type === 'SADHANA_REMINDER') {
                try {
                  // Create a local notification that is STICKY (ongoing: true)
                  await LocalNotifications.schedule({
                    notifications: [
                      {
                        id: 108,
                        title: data.title || '🪷 Daily Sadhana Reminder',
                        body: data.body || 'Hare Krishna! Please take a moment to log yesterday\'s spiritual activities.',
                        ongoing: true, // This makes it non-dismissable on Android
                        smallIcon: 'ic_launcher', // using standard launcher icon as fallback
                        schedule: { at: new Date(Date.now() + 100) }, // Schedule for immediate display
                        extra: { type: 'sticky_reminder' }
                      }
                    ]
                  });
                  console.log('Sticky Local Notification scheduled');
                } catch (err) {
                  console.error('Failed to schedule local notification:', err);
                }
              } else if (notification.title) {
                // Show a nice toast if a regular (non-sticky) notification arrives while open
                toast(notification.title, {
                  icon: '🔔',
                  duration: 4000
                });
              }
            });

            // Handle notification clicks
            await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
              console.log('Push action performed: ', notification);
            });

            // Finally, register with FCM
            // This will trigger the 'registration' listener above
            await PushNotifications.register();
            
            // Fallback: If for some reason the listener doesn't fire (already registered),
            // you might need to check if you can get the token directly.
            // But Capacitor doesn't provide a 'getToken' method outside the listener.
            // So we'll rely on the register call and maybe add a small timeout check if needed.
            console.log('Push register called');
          } else {
            // Show one-time warning if permissions are blocked at the OS level
            toast.error('Permissions blocked. Please enable notifications in your phone settings to receive 8 AM reminders.', { duration: 6000 });
          }
        } catch (err) {
          console.error('Push notification setup error:', err);
        }
      };
      setupPush();
    }
    
    // Cleanup listeners on unmount (optional but recommended)
    return () => {
      if (isNative()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [user]);

  // Show group select modal for non-owner, non-brahmacari users who haven't chosen a group yet
  const needsGroupSelect = user && user.role !== 'owner' && user.group_name !== 'brahmacari' && user.group_name === null;

  // Prefetch all lazy chunks silently once user is logged in
  useEffect(() => {
    if (user) {
      // Use requestIdleCallback so we don't compete with the initial render
      const prefetch = () => {
        import('./pages/Dashboard');
        import('./pages/History');
        import('./pages/AdminDashboard');
        import('./components/GroupSelectModal');
      };
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(prefetch);
      } else {
        setTimeout(prefetch, 2000);
      }
    }
  }, [user]);

  return (
    <>
      {updateAvailable && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full mx-auto shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-rose-500"></div>
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚀</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Update Required</h2>
            <p className="text-gray-600 mb-6 font-medium leading-relaxed text-sm">
              Version {updateAvailable.version} is now available! Please update to continue tracking your Sadhana seamlessly.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.open(updateAvailable.url, '_system')}
                className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-95 text-sm"
              >
                Download Update Now
              </button>
              <button
                onClick={() => {
                  setUpdateDismissed(true);
                  setUpdateAvailable(null);
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 px-6 rounded-xl transition-all active:scale-95 text-sm"
              >
                Not Right Now
              </button>
            </div>
          </div>
        </div>
      )}

      {needsGroupSelect && (
        <GroupSelectModal onComplete={(group_name) => updateUser({ group_name })} />
      )}
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-center" />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
