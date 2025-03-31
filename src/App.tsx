import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useAppState } from './hooks/useAppState';
import { FaHome, FaCog } from 'react-icons/fa';

// We'll create these components next
import Home from './pages/Home';
import Expenses from './pages/Expenses';
import Goals from './pages/Goals';
import Investments from './pages/Investments';
import Settings from './pages/Settings';
import Income from './pages/Income';

function App() {
  const { state } = useAppState();
  const { darkMode } = state.settings;

  return (
    <Router>
      <div className={`min-h-full ${darkMode ? 'dark' : ''}`}>
        <div className="page-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/income" element={<Income />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>

        {/* Mobile Navigation Bar */}
        <nav className="bottom-nav">
          <div className="bottom-nav-container">
            <div className="bottom-nav-items">
              <NavLink to="/" icon={<FaHome size={20} />} label="Home" />
              <NavLink to="/settings" icon={<FaCog size={20} />} label="Settings" />
            </div>
          </div>
        </nav>
      </div>
    </Router>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavLink({ to, icon, label }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
    >
      <span className="mb-1">{icon}</span>
      <span className="text-xs">{label}</span>
    </Link>
  );
}

export default App;
