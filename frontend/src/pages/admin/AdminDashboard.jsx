import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useI18n } from '../../context/I18nContext';

const KpiCard = ({ label, value, accent }) => (
  <div className="card p-5">
    <p className="text-xs text-muted mb-1">{label}</p>
    <p className={`text-2xl font-bold ${accent || 'text-ink'}`}>{value}</p>
  </div>
);

const AdminDashboard = () => {
  const { socket } = useSocket();
  const { t, statusLabel, money, arrow } = useI18n();
  const [metrics, setMetrics] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const loadMetrics = async () => {
    const { data } = await api.get('/admin/metrics');
    setMetrics(data.metrics);
  };

  useEffect(() => { loadMetrics(); }, []);

  useEffect(() => {
    if (!socket) return;
    const pushNotif = (text) =>
      setNotifications((n) => [{ id: Date.now() + Math.random(), text }, ...n].slice(0, 30));

    const onNewOrder = (order) => {
      pushNotif(t('admin.newOrder', { from: order.pickupAddress.city, to: order.deliveryAddress.city }).replace('→', arrow).replace('←', arrow));
      loadMetrics();
    };
    const onOrderUpdated = (order) => {
      pushNotif(t('admin.orderNow', { id: order._id.slice(-5), status: statusLabel(order.status) }));
      loadMetrics();
    };
    const onStatusChange = ({ orderId, status }) => {
      pushNotif(t('admin.orderStatus', { id: orderId.toString().slice(-5), status: statusLabel(status) }).replace('→', arrow).replace('←', arrow));
    };
    const onDriverPresence = ({ driverId, isOnline }) => {
      pushNotif(t('admin.driverPresence', { id: driverId.toString().slice(-5), state: isOnline ? t('admin.stateOnline') : t('admin.stateOffline') }));
    };
    const onRejected = ({ orderId, driverId }) => {
      pushNotif(t('admin.driverRejected', { id: driverId.toString().slice(-5), orderId: orderId.toString().slice(-5) }));
    };

    socket.on('new_order', onNewOrder);
    socket.on('order_updated', onOrderUpdated);
    socket.on('status_change', onStatusChange);
    socket.on('driver_presence', onDriverPresence);
    socket.on('job_rejected', onRejected);

    return () => {
      socket.off('new_order', onNewOrder);
      socket.off('order_updated', onOrderUpdated);
      socket.off('status_change', onStatusChange);
      socket.off('driver_presence', onDriverPresence);
      socket.off('job_rejected', onRejected);
    };
  }, [socket, t, statusLabel, arrow]);

  if (!metrics) return <div className="p-6 text-muted">{t('admin.loadingDashboard')}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="h-title">{t('admin.dashboard')}</h1>
        <div className="flex gap-2">
          <Link to="/admin/map" className="btn-soft">{t('admin.liveMap')}</Link>
          <Link to="/admin/drivers" className="btn-neutral">{t('admin.drivers')}</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard label={t('admin.totalOrders')} value={metrics.totalOrders} />
        <KpiCard label={t('admin.activeDeliveries')} value={metrics.activeDeliveries} accent="text-primary-700" />
        <KpiCard label={t('admin.onlineDrivers')} value={metrics.onlineDrivers} accent="text-primary-600" />
        <KpiCard label={t('admin.revenue')} value={money(metrics.revenue)} accent="text-primary-600" />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-ink mb-3">{t('admin.feed')}</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted">{t('admin.waiting')}</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id} className="text-sm text-gray-600 border-b border-line pb-2 last:border-0 last:pb-0">
                {n.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;