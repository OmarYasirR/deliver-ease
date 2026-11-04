import { Link, useNavigate } from 'react-router-dom';
import {
  MdAccountCircle,
  MdLogout,
  MdPerson,
  MdLocalShipping,
  MdAdminPanelSettings,
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

const Navbar = () => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const RoleIcon = user ? roleIcon[user.role] : null;

  return (
    <nav className="bg-surface border-b border-line px-4 sm:px-6 py-3 flex items-center justify-between">
      <Link to={user ? roleHome[user.role] : '/'} aria-label="DeliverEase">
        <Logo size={34} />
      </Link>

      <div className="flex items-center gap-2 sm:gap-3 text-sm">
        <LanguageSwitcher />

        {user && (
          <>
            {/* User identity */}
            <div className="flex items-center gap-2 min-w-0">
              <MdAccountCircle
                className="w-5 h-5 text-primary-600 shrink-0"
                aria-hidden="true"
              />
              <span className="font-medium text-ink truncate max-w-[10ch] sm:max-w-none">
                {user.name}
              </span>

              {RoleIcon && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-[11px] font-semibold uppercase tracking-wide">
                  <RoleIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  {t(`role.${user.role}`)}
                </span>
              )}
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <MdLogout className="w-4 h-4" aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">{t('common.logout')}</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;