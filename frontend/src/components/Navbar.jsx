import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  MdAddBox,
  MdAdminPanelSettings,
  MdDashboard,
  MdGroups,
  MdKeyboardArrowDown,
  MdLocalShipping,
  MdLogout,
  MdMap,
  MdPerson,
  MdReceiptLong,
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import Logo from './Logo';

const roleHome = { customer: '/customer', driver: '/driver', admin: '/admin' };

const roleIcon = {
  customer: MdPerson,
  driver: MdLocalShipping,
  admin: MdAdminPanelSettings,
};

// Primary navigation per role (desktop: inline links, mobile: inside the account menu)
const navLinks = {
  customer: [
    { to: '/customer', end: true, icon: MdReceiptLong, key: 'nav.orders' },
    { to: '/customer/new', end: true, icon: MdAddBox, key: 'nav.newOrder' },
  ],
  driver: [{ to: '/driver', end: false, icon: MdLocalShipping, key: 'nav.jobs' }],
  admin: [
    { to: '/admin', end: true, icon: MdDashboard, key: 'nav.dashboard' },
    { to: '/admin/map', end: true, icon: MdMap, key: 'nav.liveMap' },
    { to: '/admin/drivers', end: true, icon: MdGroups, key: 'nav.drivers' },
  ],
};

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const linkClass = ({ isActive }) =>
  `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
  }`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const RoleIcon = user ? roleIcon[user.role] : null;
  const links = user ? navLinks[user.role] || [] : [];

  // Close the account menu on route change, outside click, or Escape
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-line">
      <nav className="max-w-6xl mx-auto h-14 sm:h-16 px-3 sm:px-6 flex items-center gap-2 sm:gap-4">
        <Link to={user ? roleHome[user.role] : '/'} aria-label="DeliverEase" className="shrink-0">
          <Logo size={32} />
        </Link>

        {/* Desktop navigation */}
        {links.length > 0 && (
          <div className="hidden md:flex items-center gap-1 ms-2" role="navigation">
            {links.map(({ to, end, icon: Icon, key }) => (
              <NavLink key={to} to={to} end={end} className={linkClass}>
                <Icon className="w-5 h-5" aria-hidden="true" />
                {t(key)}
              </NavLink>
            ))}
          </div>
        )}

        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher compact />

          {user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={t('nav.account')}
                className="flex items-center gap-2 ps-1 pe-1 sm:pe-2 py-1 rounded-full hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <span className="w-8 h-8 rounded-full bg-brand-600 text-on-primary text-xs font-bold flex items-center justify-center">
                  {initials(user.name) || <MdPerson aria-hidden="true" />}
                </span>
                <span className="hidden sm:block text-sm font-medium text-ink max-w-[14ch] truncate">{user.name}</span>
                <MdKeyboardArrowDown
                  className={`hidden sm:block w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute end-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-surface border border-line shadow-lg p-2"
                >
                  {/* Identity */}
                  <div className="px-3 py-2.5">
                    <p className="font-semibold text-ink truncate">{user.name}</p>
                    {user.email && <p className="text-xs text-muted truncate" dir="ltr">{user.email}</p>}
                    {RoleIcon && (
                      <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold uppercase tracking-wide">
                        <RoleIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        {t(`role.${user.role}`)}
                      </span>
                    )}
                  </div>

                  {/* Navigation (mobile only; on md+ it's inline in the bar) */}
                  {links.length > 0 && (
                    <div className="md:hidden border-t border-line mt-1 pt-1" role="none">
                      {links.map(({ to, end, icon: Icon, key }) => (
                        <NavLink key={to} to={to} end={end} role="menuitem" className={(s) => `${linkClass(s)} w-full`}>
                          <Icon className="w-5 h-5" aria-hidden="true" />
                          {t(key)}
                        </NavLink>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-line mt-1 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                    >
                      <MdLogout className="w-5 h-5" aria-hidden="true" />
                      {t('common.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
