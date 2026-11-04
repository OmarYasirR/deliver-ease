import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useI18n } from '../../context/I18nContext';

const OrderHistory = () => {
  const { t, statusLabel, formatDate, money, arrow } = useI18n();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/orders/my');
        setOrders(data.orders);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const badgeClass = (status) => `status-badge status-${status.replace(/\s+/g, '_')}`;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">{t('order.historyTitle')}</h1>
        <Link to="/customer/new" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          {t('order.new')}
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">{t('order.none')}</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              to={`/customer/track/${o._id}`}
              key={o._id}
              className="block bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-800 text-sm">
                  {o.pickupAddress.city} {arrow} {o.deliveryAddress.city}
                </span>
                <span className={badgeClass(o.status)}>{statusLabel(o.status)}</span>
              </div>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>{formatDate(o.createdAt)}</span>
                <span>{t(`priority.${o.priority}`)} · {money(o.price)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
