import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import LiveMap from '../../components/LiveMap';
import { useI18n } from '../../context/I18nContext';

const NEXT_STATUS = {
  Assigned: 'Picked Up',
  'Picked Up': 'In Transit',
  'In Transit': 'Delivered',
};

const ActiveDelivery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { t, statusLabel } = useI18n();
  const [order, setOrder] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [myPos, setMyPos] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit('join_order', { orderId: id });
    return () => socket.emit('leave_order', { orderId: id });
  }, [socket, connected, id]);

  const startBroadcast = () => {
    if (!navigator.geolocation) {
      alert(t('driver.noGeo'));
      return;
    }
    setBroadcasting(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyPos({ lat: latitude, lng: longitude });
        socket?.emit('update_location', { orderId: id, lat: latitude, lng: longitude });
      },
      (err) => console.warn('Geolocation error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const stopBroadcast = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setBroadcasting(false);
  };

  useEffect(() => () => stopBroadcast(), []);

  const advanceStatus = async () => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    const { data } = await api.patch(`/driver/jobs/${id}/status`, { status: next });
    setOrder(data.order);
    if (next === 'Delivered') {
      stopBroadcast();
      navigate('/driver');
    }
  };

  if (!order) return <div className="p-6 text-gray-500">{t('common.loading')}</div>;

  const markers = [
    { id: 'pickup', lat: order.pickupAddress.lat, lng: order.pickupAddress.lng, label: t('driver.pickup') },
    { id: 'delivery', lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng, label: t('driver.delivery') },
  ];
  if (myPos) markers.push({ id: 'driver', ...myPos, label: t('driver.you'), type: 'driver' });

  return (
    <div className="max-w-5xl mx-auto p-6 grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 h-[70vh] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <LiveMap markers={markers} routeLine={order.route?.waypoints} followId="driver" />
      </div>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-2">{t('driver.deliveryStatus')}</h2>
          <span className={`status-badge status-${order.status.replace(/\s+/g, '_')}`}>{statusLabel(order.status)}</span>

          {NEXT_STATUS[order.status] && (
            <button
              onClick={advanceStatus}
              className="mt-3 w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium"
            >
              {t('driver.markAs', { status: statusLabel(NEXT_STATUS[order.status]) })}
            </button>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-2">{t('driver.locationSharing')}</h2>
          <button
            onClick={broadcasting ? stopBroadcast : startBroadcast}
            className={`w-full py-2 rounded-lg text-sm font-medium ${
              broadcasting ? 'bg-accent text-on-accent' : 'bg-brand-100 text-brand-700'
            }`}
          >
            {broadcasting ? t('driver.stopGps') : t('driver.startGps')}
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-sm text-gray-600">
          <p><strong>{t('driver.pickup')}:</strong> {order.pickupAddress.line1}, {order.pickupAddress.city}</p>
          <p className="mt-1"><strong>{t('driver.delivery')}:</strong> {order.deliveryAddress.line1}, {order.deliveryAddress.city}</p>
          {order.parcel.instructions && <p className="mt-2 text-xs text-gray-500">{order.parcel.instructions}</p>}
        </div>
      </div>
    </div>
  );
};

export default ActiveDelivery;
