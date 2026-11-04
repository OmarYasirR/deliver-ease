import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useI18n } from '../../context/I18nContext';

const DriverManagement = () => {
  const { socket } = useSocket();
  const { t, arrow } = useI18n();
  const [drivers, setDrivers] = useState([]);
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [assigning, setAssigning] = useState({}); // orderId -> driverId selection

  const loadData = async () => {
    const [{ data: driverData }, { data: orderData }] = await Promise.all([
      api.get('/admin/drivers'),
      api.get('/admin/orders', { params: { unassigned: true, status: 'Pending' } }),
    ]);
    setDrivers(driverData.drivers);
    setUnassignedOrders(orderData.orders);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => loadData();
    socket.on('new_order', refresh);
    socket.on('order_updated', refresh);
    socket.on('driver_presence', refresh);
    return () => {
      socket.off('new_order', refresh);
      socket.off('order_updated', refresh);
      socket.off('driver_presence', refresh);
    };
  }, [socket]);

  const assign = async (orderId) => {
    const driverId = assigning[orderId];
    if (!driverId) return;
    await api.patch(`/admin/orders/${orderId}/assign`, { driverId });
    loadData();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 grid md:grid-cols-2 gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800 mb-4">{t('admin.drivers')}</h1>
        <div className="space-y-3">
          {drivers.map((d) => (
            <div key={d._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800 text-sm">{d.name}</span>
                <span className={`status-badge ${d.isOnline ? 'status-Delivered' : 'status-Cancelled'}`}>
                  {d.isOnline ? t('admin.badgeOnline') : t('admin.badgeOffline')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t(`driverStatus.${d.profile?.status || 'offline'}`)} · {t('admin.deliveriesCount', { count: d.profile?.completedDeliveries || 0 })}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-800 mb-4">{t('admin.unassigned')}</h1>
        {unassignedOrders.length === 0 ? (
          <p className="text-sm text-gray-400">{t('admin.nothingUnassigned')}</p>
        ) : (
          <div className="space-y-3">
            {unassignedOrders.map((o) => (
              <div key={o._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-800 mb-2">
                  {o.pickupAddress.city} {arrow} {o.deliveryAddress.city}
                </p>
                <div className="flex gap-2">
                  <select
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    value={assigning[o._id] || ''}
                    onChange={(e) => setAssigning({ ...assigning, [o._id]: e.target.value })}
                  >
                    <option value="">{t('admin.selectDriver')}</option>
                    {drivers
                      .filter((d) => d.isOnline)
                      .map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => assign(o._id)}
                    className="bg-brand-600 text-white text-sm px-3 py-1.5 rounded-lg"
                  >
                    {t('admin.assign')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverManagement;
