import { useEffect, useContext, lazy, Suspense } from 'react';
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
import { isNative } from './utils/platform';
import api from './api';

// Inner component so it can use AuthContext
function AppRoutes() {
  const { user, updateUser } = useContext(AuthContext);

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

            // Handle received notifications while app is in foreground
            await PushNotifications.addListener('pushNotificationReceived', (notification) => {
              console.log('Push received: ', notification);
              // Show a nice toast if received while the app is actively open
              toast(notification.title || 'Sadhana Reminder! 🪷', {
                icon: '🔔',
                duration: 4000
              });
            });

            // Handle notification clicks
            await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
              console.log('Push action performed: ', notification);
            });

            // Finally, register with FCM
            await PushNotifications.register();
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
