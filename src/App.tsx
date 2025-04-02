import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAppState } from './hooks/useAppState';
import { FaHome, FaCog } from 'react-icons/fa';
import { AuthProvider } from './contexts/AuthContext';
import { useFirestore } from './hooks/useFirestore';
import PrivateRoute from './components/PrivateRoute';
import { useAuth } from './contexts/AuthContext';

// Import pages
import Home from './pages/Home';
import Expenses from './pages/Expenses';
import Goals from './pages/Goals';
import Investments from './pages/Investments';
import Settings from './pages/Settings';
import Income from './pages/Income';
import Login from './pages/Login';
import Signup from './pages/Signup';

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1">
      {icon}
      <span className="text-xs">{label}</span>
    </Link>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (currentUser) {
    console.log('User is authenticated, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('User is not authenticated, showing public route');
  return <>{children}</>;
}

function AppContent() {
  const { state } = useAppState();
  const { darkMode } = state.settings;
  useFirestore();

  return (
    <Router>
      <div className={`min-h-full ${darkMode ? 'dark' : ''}`}>
        <div className="page-container">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

            {/* Protected routes */}
            <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/income" element={<PrivateRoute><Income /></PrivateRoute>} />
            <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
            <Route path="/goals" element={<PrivateRoute><Goals /></PrivateRoute>} />
            <Route path="/investments" element={<PrivateRoute><Investments /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Only show navigation when user is authenticated */}
        <PrivateRoute>
          <nav className="bottom-nav">
            <div className="bottom-nav-container">
              <div className="bottom-nav-items">
                <NavLink to="/" icon={<FaHome size={20} />} label="Home" />
                <NavLink to="/settings" icon={<FaCog size={20} />} label="Settings" />
              </div>
            </div>
          </nav>
        </PrivateRoute>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
