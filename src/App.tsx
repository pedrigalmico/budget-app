import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useAppState } from './hooks/useAppState';
import {
  FaHome, FaCog, FaWallet, FaArrowUp, FaBullseye, FaChartLine, FaChartPie, FaSignOutAlt,
} from 'react-icons/fa';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { useFirestore } from './hooks/useFirestore';
import PrivateRoute from './components/PrivateRoute';

import Home from './pages/Home';
import Expenses from './pages/Expenses';
import Goals from './pages/Goals';
import Investments from './pages/Investments';
import Settings from './pages/Settings';
import Income from './pages/Income';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Signup from './pages/Signup';

const NAV_ITEMS = [
  { to: '/',            label: 'Overview',    icon: FaHome },
  { to: '/income',      label: 'Income',      icon: FaArrowUp },
  { to: '/expenses',    label: 'Expenses',    icon: FaWallet },
  { to: '/goals',       label: 'Goals',       icon: FaBullseye },
  { to: '/investments', label: 'Investments', icon: FaChartLine },
  { to: '/reports',     label: 'Reports',     icon: FaChartPie },
  { to: '/settings',    label: 'Settings',    icon: FaCog },
] as const;

const MOBILE_NAV = [
  { to: '/',            label: 'Home',     icon: FaHome },
  { to: '/expenses',    label: 'Expenses', icon: FaWallet },
  { to: '/investments', label: 'Invest',   icon: FaChartLine },
  { to: '/goals',       label: 'Goals',    icon: FaBullseye },
  { to: '/reports',     label: 'Reports',  icon: FaChartPie },
] as const;

function Sidebar() {
  const { currentUser, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <span className="text-sm font-bold">M</span>
        </div>
        <div className="leading-tight">
          <div className="text-base">MiKai</div>
          <div className="text-[11px] text-ink-400 font-normal">Personal Finance</div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Workspace</div>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            <Icon size={15} className="opacity-90" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] text-ink-400">Signed in</div>
            <div className="text-xs text-ink-100 truncate">{currentUser?.email ?? '—'}</div>
          </div>
          <button
            onClick={() => logout?.()}
            className="btn btn-ghost btn-icon"
            title="Sign out"
          >
            <FaSignOutAlt size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileNav() {
  const { pathname } = useLocation();
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        <div className="bottom-nav-items">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={`nav-item ${active ? 'nav-item-active' : ''}`}
              >
                <span className="nav-item-icon"><Icon size={16} /></span>
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    );
  }
  if (currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthedShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="page-container animate-fade-in">{children}</main>
      <MobileNav />
    </>
  );
}

function AppContent() {
  const { state } = useAppState();
  const { darkMode } = state.settings;
  useFirestore();

  return (
    <Router>
      <div className={`app-shell ${darkMode === false ? '' : 'dark'}`}>
        <Routes>
          <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          <Route path="/"            element={<PrivateRoute><AuthedShell><Home /></AuthedShell></PrivateRoute>} />
          <Route path="/income"      element={<PrivateRoute><AuthedShell><Income /></AuthedShell></PrivateRoute>} />
          <Route path="/expenses"    element={<PrivateRoute><AuthedShell><Expenses /></AuthedShell></PrivateRoute>} />
          <Route path="/goals"       element={<PrivateRoute><AuthedShell><Goals /></AuthedShell></PrivateRoute>} />
          <Route path="/investments" element={<PrivateRoute><AuthedShell><Investments /></AuthedShell></PrivateRoute>} />
          <Route path="/reports"     element={<PrivateRoute><AuthedShell><Reports /></AuthedShell></PrivateRoute>} />
          <Route path="/settings"    element={<PrivateRoute><AuthedShell><Settings /></AuthedShell></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <AppContent />
      </LoadingProvider>
    </AuthProvider>
  );
}

export default App;
