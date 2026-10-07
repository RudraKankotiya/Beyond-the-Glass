import { startTransition, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import useAuth from '../hooks/useAuth.js';
import Logo from './Logo.jsx';

const LINKS = [
  { to: '/discover', label: 'Discover' },
  { to: '/collection', label: 'My Collection' },
];

// Desktop: active page gets a thin gold underline. Mobile: larger, stacked links.
const linkClass = (mobile) => ({ isActive }) =>
  [
    'transition-colors hover:text-ink',
    isActive ? 'text-ink underline decoration-gold decoration-1 underline-offset-8' : 'text-ink-muted',
    mobile ? 'block py-3 font-display text-2xl' : 'text-sm',
  ].join(' ');

function NavLinks({ mobile = false }) {
  const { isStaff } = useAuth();
  const links = isStaff ? [...LINKS, { to: '/dashboard', label: 'Dashboard' }] : LINKS;

  return (
    <ul className={mobile ? 'flex flex-col' : 'flex items-center gap-7'}>
      {links.map(({ to, label }) => (
        <li key={to}>
          <NavLink to={to} className={linkClass(mobile)}>
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function AuthActions({ mobile = false }) {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  // While the saved login is being checked, show nothing (avoids a "Log in" flash)
  if (isLoading) return null;

  const wrapper = mobile ? 'flex flex-col items-start gap-4' : 'flex items-center gap-5';

  if (!user) {
    return (
      <div className={wrapper}>
        <Link to="/login" className="text-sm text-ink-muted transition-colors hover:text-ink">
          Log in
        </Link>
        <Link to="/register" className="btn btn-outline py-2">
          Register
        </Link>
      </div>
    );
  }

  const handleLogout = () => {
    // React Router applies navigation as a "transition" (a low-priority update). Putting the
    // logout in the same transition makes React render both changes together; otherwise a
    // protected page would first re-render without a user and redirect to /login.
    startTransition(() => {
      navigate('/');
      logout();
    });
  };

  return (
    <div className={wrapper}>
      <span className="max-w-40 truncate text-sm text-ink-muted" title={user.email}>
        {user.name}
      </span>
      <button type="button" onClick={handleLogout} className="btn btn-outline py-2">
        Log out
      </button>
    </div>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu after navigating to another page
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close the mobile menu with the Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className="border-b border-line">
      <div className="page-container flex h-16 items-center justify-between gap-6">
        <Logo />

        {/* Desktop navigation (md and up) */}
        <nav aria-label="Main" className="hidden md:block">
          <NavLinks />
        </nav>
        <div className="hidden md:block">
          <AuthActions />
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="-mr-2.5 p-2.5 text-ink md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
          </svg>
        </button>
      </div>

      {/* Mobile navigation panel */}
      {menuOpen && (
        <div id="mobile-menu" className="border-t border-line md:hidden">
          <div className="page-container flex flex-col gap-6 py-6">
            <nav aria-label="Main">
              <NavLinks mobile />
            </nav>
            <AuthActions mobile />
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
