import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data.order);
        if (data.order.currentLocation?.lat) {
          setDriverPos({ 
            lat: data.order.currentLocation.lat, 
            lng: data.order.currentLocation.lng 
          });
        }
      } catch (err) {
        console.error("Failed to load order:", err);
        setError(err.response?.data?.message || 'Could not load order. The server might be waking up.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  
  useEffect(() => {
    if (!socket || !connected || !id) return;

    socket.emit('join_order', { orderId: id });

    const onLocation = (payload) => {
      // Ensure we compare strings to avoid ObjectId mismatch issues
      if (String(payload.orderId) === String(id)) {
        setDriverPos({ lat: payload.lat, lng: payload.lng });
      }
    };
    
    const onStatus = (payload) => {
      if (String(payload.orderId) === String(id)) {
        setOrder((prev) => (prev ? { ...prev, status: payload.status, driver: payload.driver || prev.driver } : prev));
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

  // 3. Loading and Error States
  if (loading) return <div className="p-6 text-gray-500">{t('common.loading')}</div>;
  
  if (error || !order) {
    return (
      <div className="p-6 text-center">
        <p className="text-danger-600 mb-4">{error || 'Order not found'}</p>
        <Link to="/customer" className="text-brand-600 hover:underline">Go back to Dashboard</Link>
      </div>
    );
  }

  // 4. Safely build markers (won't crash if an address is missing)
  const markers = [];
  if (order.pickupAddress?.lat && order.pickupAddress?.lng) {
    markers.push({
      id: 'pickup',
      lat: order.pickupAddress.lat,
      lng: order.pickupAddress.lng,
      label: t('order.pickupLabel', { address: order.pickupAddress.line1 || 'Pickup' }),
    });
  }
  if (order.deliveryAddress?.lat && order.deliveryAddress?.lng) {
    markers.push({
      id: 'delivery',
      lat: order.deliveryAddress.lat,
      lng: order.deliveryAddress.lng,
      label: t('order.deliveryLabel', { address: order.deliveryAddress.line1 || 'Delivery' }),
    });
  }
  if (driverPos) {
    markers.push({ 
      id: 'driver', 
      ...driverPos, 
      label: t('order.driverLocation'), 
      type: 'driver' 
    });
  }

  // Fallback center if no pickup address exists
  const mapCenter = order.pickupAddress?.lat && order.pickupAddress?.lng 
    ? [order.pickupAddress.lat, order.pickupAddress.lng] 
    : [15.5007, 32.5599]; // Default to Khartoum, Sudan if no address exists

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 grid md:grid-cols-3 gap-4 sm:gap-6">
      <div className="md:col-span-2 h-[45vh] min-h-[280px] md:h-[70vh] md:min-h-[420px] rounded-2xl overflow-hidden border border-line shadow-sm">
        <LiveMap
          markers={markers}
          routeLine={order.route?.waypoints || []}
          followId="driver"
          center={mapCenter}
        />
      </div>

      <div className="space-y-4">
        <div className="bg-surface p-4 rounded-2xl border border-line shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-2">{t('order.status')}</h2>
          <span className={`status-badge status-${order.status?.replace(/\s+/g, '_')}`}>
            {statusLabel(order.status)}
          </span>
          {!connected && <p className="text-xs text-accent-700 mt-2">{t('order.reconnecting')}</p>}
        </div>

        {order.driver && (
          <div className="bg-surface p-4 rounded-2xl border border-line shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-2">{t('order.driver')}</h2>
            <p className="text-sm text-gray-600">{order.driver.name}</p>
            {order.driver.phone && (
              <a href={`tel:${order.driver.phone}`} className="text-sm text-brand-700 font-medium hover:underline" dir="ltr">
                {order.driver.phone}
              </a>
            )}
          </div>
        )}

        {order.route?.distanceMeters && (
          <div className="bg-surface p-4 rounded-2xl border border-line shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-2">{t('order.route')}</h2>
            <p className="text-sm text-gray-600">{t('order.km', { value: (order.route.distanceMeters / 1000).toFixed(1) })}</p>
            <p className="text-sm text-gray-500">{t('order.minDrive', { value: Math.round(order.route.durationSeconds / 60) })}</p>
          </div>
        )}

        <div className="bg-surface p-4 rounded-2xl border border-line shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-2">{t('order.parcel')}</h2>
          <p className="text-sm text-gray-600">{order.parcel?.weightKg} kg · {t(`priority.${order.priority}`)}</p>
          {order.parcel?.instructions && (
            <p className="text-xs text-gray-500 mt-1">{order.parcel.instructions}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;