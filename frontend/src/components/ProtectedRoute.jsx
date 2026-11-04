import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

/**
 * Wrap protected routes with this. Pass `roles` to restrict to specific roles,
 * e.g. <ProtectedRoute roles={['admin']} />
 */
const ProtectedRoute = ({ roles }) => {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        {t('common.loading')}
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
