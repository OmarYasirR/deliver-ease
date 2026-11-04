import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { useI18n } from './context/I18nContext';

import Login from './pages/Login';
import Register from './pages/Register';

import CreateOrder from './pages/customer/CreateOrder';
import OrderHistory from './pages/customer/OrderHistory';
import TrackOrder from './pages/customer/TrackOrder';

import DriverDashboard from './pages/driver/DriverDashboard';
import ActiveDelivery from './pages/driver/ActiveDelivery';

import AdminDashboard from './pages/admin/AdminDashboard';
import GlobalMap from './pages/admin/GlobalMap';
import DriverManagement from './pages/admin/DriverManagement';

const Layout = () => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    <Outlet />
  </div>
);

const Unauthorized = () => {
  const { t } = useI18n();
  return (
    <div className="h-screen flex items-center justify-center text-gray-500">
      {t('common.unauthorized')}
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Layout />}>
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route element={<ProtectedRoute roles={['customer']} />}>
          <Route path="/customer" element={<OrderHistory />} />
          <Route path="/customer/new" element={<CreateOrder />} />
          <Route path="/customer/track/:id" element={<TrackOrder />} />
        </Route>

        <Route element={<ProtectedRoute roles={['driver']} />}>
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/driver/active/:id" element={<ActiveDelivery />} />
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/map" element={<GlobalMap />} />
          <Route path="/admin/drivers" element={<DriverManagement />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
