import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import LiveMap from '../../components/LiveMap';
import { useI18n } from '../../context/I18nContext';

const TrackOrder = () => {
  const { id } = useParams();
  const { t, statusLabel } = useI18n();
  const { socket, connected } = useSocket();
  const [order, setOrder] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [statusLog, setStatusLog] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order);
      if (data.order.currentLocation?.lat) {
        setDriverPos({ lat: data.order.currentLocation.lat, lng: data.order.currentLocation.lng });
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('join_order', { orderId: id });

    const onLocation = (payload) => {
      if (payload.orderId === id) setDriverPos({ lat: payload.lat, lng: payload.lng });
    };
    const onStatus = (payload) => {
      if (payload.orderId === id) {
        setOrder((prev) => (prev ? { ...prev, status: payload.status, driver: payload.driver || prev.driver } : prev));
        setStatusLog((log) => [...log, payload.status]);
      }
    };

    socket.on('location_changed', onLocation);
    socket.on('status_change', onStatus);

    return () => {
      socket.emit('leave_order', { orderId: id });
      socket.off('location_changed', onLocation);
      socket.off('status_change', onStatus);
    };
  }, [socket, connected, id]);

  if (!order) return <div className="p-6 text-gray-500">{t('order.loading')}</div>;

  const markers = [
    { id: 'pickup', lat: order.pickupAddress.lat, lng: order.pickupAddress.lng, label: t('order.pickupLabel', { address: order.pickupAddress.line1 }) },
    { id: 'delivery', lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng, label: t('order.deliveryLabel', { address: order.deliveryAddress.line1 }) },
  ];
  if (driverPos) markers.push({ id: 'driver', ...driverPos, label: t('order.driverLocation'), type: 'driver' });

  return (
    <div className="max-w-5xl mx-auto p-6 grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 h-[70vh] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <LiveMap
          markers={markers}
          routeLine={order.route?.waypoints}
          followId="driver"
          center={[order.pickupAddress.lat, order.pickupAddress.lng]}
        />
      </div>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-2">{t('order.status')}</h2>
          <span className={`status-badge status-${order.status.replace(/\s+/g, '_')}`}>{statusLabel(order.status)}</span>
          {!connected && <p className="text-xs text-accent-700 mt-2">{t('order.reconnecting')}</p>}
        </div>

        {order.driver && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-2">{t('order.driver')}</h2>
            <p className="text-sm text-gray-600">{order.driver.name}</p>
            <p className="text-sm text-gray-500">{order.driver.phone}</p>
          </div>
        )}

        {order.route?.distanceMeters && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-2">{t('order.route')}</h2>
            <p className="text-sm text-gray-600">{t('order.km', { value: (order.route.distanceMeters / 1000).toFixed(1) })}</p>
            <p className="text-sm text-gray-500">{t('order.minDrive', { value: Math.round(order.route.durationSeconds / 60) })}</p>
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-2">{t('order.parcel')}</h2>
          <p className="text-sm text-gray-600">{order.parcel.weightKg} kg · {t(`priority.${order.priority}`)}</p>
          {order.parcel.instructions && (
            <p className="text-xs text-gray-500 mt-1">{order.parcel.instructions}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
