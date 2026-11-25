import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Workout Builder', to: '/workouts' },
  { label: 'Progress', to: '/progress' }
];

export default function SiteLayout() {
  return (
    <div className="site-shell">
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="Workout Builder home">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span className="brand-name">FORGE<span>.</span></span>
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => (
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
        <div className="nav-actions">
          <NavLink className="login-link" to="/login">Log in</NavLink>
          <NavLink className="button button-small" to="/register">Get started <span aria-hidden="true">↗</span></NavLink>
        </div>
      </header>
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
