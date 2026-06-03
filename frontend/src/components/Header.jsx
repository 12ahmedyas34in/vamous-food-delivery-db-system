// frontend/src/components/Header.jsx

import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';

// ── NavLink className helpers ─────────────────────────────────────────────────
// Desktop nav link — underline animates in when active
const navLinkClass = ({ isActive }) => [
  'text-sm font-body font-medium transition-colors duration-200',
  'relative after:absolute after:bottom-[-2px] after:left-0',
  'after:h-[1.5px] after:bg-brand-300 after:transition-all after:duration-200',
  isActive
    ? 'text-brand-600 after:w-full'
    : 'text-gray-600 hover:text-brand-500 after:w-0 hover:after:w-full',
].join(' ');

// Mobile nav link — background highlight when active
const mobileNavLinkClass = ({ isActive }) => [
  'py-2.5 px-3 rounded-lg text-sm font-medium transition-colors duration-150',
  isActive
    ? 'bg-brand-50 text-brand-600'
    : 'text-gray-700 hover:bg-gray-50 hover:text-brand-600',
].join(' ');

const Header = () => {
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [userRole,   setUserRole]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').role || ''; }
    catch { return ''; }
  });
  const navigate = useNavigate();

  // Scroll-aware shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Same-tab auth sync via custom event (dispatched by Login.js and Register.js)
  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(!!localStorage.getItem('token'));
      try { setUserRole(JSON.parse(localStorage.getItem('user') || '{}').role || ''); }
      catch { setUserRole(''); }
    };
    window.addEventListener('storage',     syncAuth);
    window.addEventListener('auth-change', syncAuth);
    return () => {
      window.removeEventListener('storage',     syncAuth);
      window.removeEventListener('auth-change', syncAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const navLinks = [
    { label: 'Browse restaurants', to: '/restaurants' },
    { label: 'Add your restaurant', to: '/add-restaurant' },
    { label: 'Sign up to deliver',  to: '/deliver' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-brand-100'
          : 'bg-white/80 backdrop-blur-sm'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-brand-300 flex items-center justify-center
              group-hover:bg-brand-400 transition-colors duration-200">
              <span className="text-white font-display font-bold text-sm leading-none">S</span>
            </div>
            <span className="font-display font-semibold text-lg text-gray-900 tracking-tight">
              Sapori<span className="text-brand-400">Vivi</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {userRole === 'admin' && (
                  <NavLink to="/admin" className={navLinkClass}>Admin Dashboard</NavLink>
                )}
                {userRole === 'restaurant_owner' && (
                  <NavLink to="/owner/dashboard" className={navLinkClass}>My Restaurant</NavLink>
                )}
                <NavLink to="/orders" className={navLinkClass}>My orders</NavLink>
                <NavLink
                  to="/restaurants"
                  className={({ isActive }) => [
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 shadow-sm',
                    isActive
                      ? 'bg-brand-400 text-white'
                      : 'bg-brand-300 text-white hover:bg-brand-400 active:bg-brand-500',
                  ].join(' ')}
                >
                  Order now
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>Log in</NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) => [
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 shadow-sm',
                    isActive
                      ? 'bg-brand-400 text-white'
                      : 'bg-brand-300 text-white hover:bg-brand-400 active:bg-brand-500',
                  ].join(' ')}
                >
                  Sign up
                </NavLink>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-800
              hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={`block h-[1.5px] bg-current transition-all duration-300 origin-center
                ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-[1.5px] bg-current transition-all duration-300
                ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
              <span className={`block h-[1.5px] bg-current transition-all duration-300 origin-center
                ${menuOpen ? '-rotate-45 -translate-y-[9px]' : ''}`} />
            </div>
          </button>

        </div>
      </div>

      {/* Mobile dropdown */}
      <div className={`md:hidden overflow-hidden transition-all duration-300
        bg-white border-t border-gray-100
        ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 py-3 flex flex-col gap-1">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              {link.label}
            </NavLink>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-3 flex gap-3">
            {isLoggedIn ? (
              <>
                {userRole === 'admin' && (
                  <NavLink
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className={mobileNavLinkClass}
                  >
                    Admin Dashboard
                  </NavLink>
                )}
                {userRole === 'restaurant_owner' && (
                  <NavLink
                    to="/owner/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className={mobileNavLinkClass}
                  >
                    My Restaurant
                  </NavLink>
                )}
                <div className="flex gap-3 mt-1">
                <NavLink
                  to="/orders"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => [
                    'flex-1 text-center py-2 rounded-full text-sm font-medium',
                    'border border-brand-300 transition-colors duration-150',
                    isActive
                      ? 'bg-brand-50 text-brand-600 border-brand-400'
                      : 'text-brand-500 hover:bg-brand-50',
                  ].join(' ')}
                >
                  My orders
                </NavLink>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex-1 text-center py-2 rounded-full text-sm font-medium
                    bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  Logout
                </button>
                </div>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => [
                    'flex-1 text-center py-2 rounded-full text-sm font-medium',
                    'border border-brand-300 transition-colors duration-150',
                    isActive
                      ? 'bg-brand-50 text-brand-600 border-brand-400'
                      : 'text-brand-500 hover:bg-brand-50',
                  ].join(' ')}
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => [
                    'flex-1 text-center py-2 rounded-full text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-400 text-white'
                      : 'bg-brand-300 text-white hover:bg-brand-400',
                  ].join(' ')}
                >
                  Sign up
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;
