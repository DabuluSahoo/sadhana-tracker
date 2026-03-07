import { useEffect, useContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

// Inner component so it can use AuthContext
function AppRoutes() {
  const { user, updateUser } = useContext(AuthContext);

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
