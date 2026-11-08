import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import LiveMap from '../../components/LiveMap';
import { useI18n } from '../../context/I18nContext';

const GlobalMap = () => {
  const { socket } = useSocket();
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [driverPositions, setDriverPositions] = useState({}); // driverId -> {lat,lng}

  const loadActiveOrders = async () => {
    const { data } = await api.get('/admin/orders', {
      params: { status: undefined },
    });
    setOrders(data.orders.filter((o) => ['Assigned', 'Picked Up', 'In Transit'].includes(o.status)));
  };

  useEffect(() => {
    loadActiveOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onLocation = ({ driverId, lat, lng }) => {
      setDriverPositions((prev) => ({ ...prev, [driverId]: { lat, lng } }));
    };
    const onOrderUpdated = () => loadActiveOrders();

    socket.on('location_changed', onLocation);
    socket.on('order_updated', onOrderUpdated);
    return () => {
      socket.off('location_changed', onLocation);
      socket.off('order_updated', onOrderUpdated);
    };
  }, [socket]);

  const markers = orders.flatMap((o) => {
    const list = [
      { id: `pickup_${o._id}`, lat: o.pickupAddress.lat, lng: o.pickupAddress.lng, label: t('admin.pickupIn', { city: o.pickupAddress.city }) },
      { id: `delivery_${o._id}`, lat: o.deliveryAddress.lat, lng: o.deliveryAddress.lng, label: t('admin.deliveryIn', { city: o.deliveryAddress.city }) },
    ];
    const driverId = o.driver?._id;
    const pos = driverId && driverPositions[driverId];
    if (pos) {
      list.push({ id: `driver_${driverId}`, ...pos, label: t('admin.driverName', { name: o.driver.name }), type: 'driver' });
    }
    return list;
  });

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">{t('admin.globalMap')}</h1>
      <div className="h-[60vh] min-h-[320px] md:h-[75vh] rounded-2xl overflow-hidden border border-line shadow-sm">
        <LiveMap markers={markers} center={markers[0] ? [markers[0].lat, markers[0].lng] : [0, 0]} zoom={4} />
      </div>
      <p className="text-xs text-gray-400 mt-2">{t('admin.activeShown', { count: orders.length })}</p>
    </div>
  );
};

export default GlobalMap;
