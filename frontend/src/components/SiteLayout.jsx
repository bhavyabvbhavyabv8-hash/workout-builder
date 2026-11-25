import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import StatusMessage from './StatusMessage.jsx';

const publicNavigation = [
  { label: 'Home', to: '/' },
  { label: 'Workout Builder', to: '/workouts' },
  { label: 'Progress', to: '/progress' }
];

const privateNavigation = [
  { label: 'Home', to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Workouts', to: '/workouts' },
  { label: 'Progress', to: '/progress' },
  { label: 'History', to: '/history' }
];

export default function SiteLayout() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const authenticated = status === 'authenticated';

  async function handleLogout() {
    setLogoutError('');
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      setLogoutError(`Signed out on this device, but server logout failed: ${error.message}`);
    } finally {
      setLoggingOut(false);
      navigate('/login', { replace: true, state: { notice: 'You have been logged out.' } });
    }
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="Workout Builder home">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span className="brand-name">FORGE<span>.</span></span>
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          {(authenticated ? privateNavigation : publicNavigation).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions" aria-label="Account navigation">
          {authenticated ? (
            <>
              <NavLink className="login-link profile-link" to="/profile">{user?.name || 'Profile'}</NavLink>
              <button className="button button-small logout-button" type="button" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </>
          ) : (
            <>
              <NavLink className="login-link" to="/login">Log in</NavLink>
              <NavLink className="button button-small" to="/register">Get started <span aria-hidden="true">↗</span></NavLink>
            </>
          )}
        </div>
      </header>
      {logoutError && <div className="page-width"><StatusMessage>{logoutError}</StatusMessage></div>}
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <NavLink className="brand footer-brand" to="/">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span className="brand-name">FORGE<span>.</span></span>
        </NavLink>
        <p>Train with intention. Track every rep.</p>
        <span className="footer-note">Workout Builder and Progressive Overload Logger</span>
      </footer>
    </div>
  );
}
