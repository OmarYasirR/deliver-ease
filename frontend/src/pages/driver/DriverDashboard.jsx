import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaCircle } from 'react-icons/fa';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useI18n } from '../../context/I18nContext';

const DriverDashboard = () => {
  const { socket } = useSocket();
  const { t, statusLabel, money, arrow } = useI18n();
  const [jobs, setJobs] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    const { data } = await api.get('/driver/jobs');
    setJobs(data.orders);
  }, []);

  useEffect(() => {
    loadJobs().finally(() => setLoading(false));
  }, [loadJobs]);

  useEffect(() => {
    if (!socket) return;
    const onOffer = () => loadJobs();
    socket.on('job_offer', onOffer);
    socket.on('new_order', onOffer); // in case admin broadcasts to drivers too
    return () => {
      socket.off('job_offer', onOffer);
      socket.off('new_order', onOffer);
    };
  }, [socket, loadJobs]);

  const toggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    await api.patch('/driver/online-status', { isOnline: next });
  };

  const accept = async (jobId) => {
    await api.patch(`/driver/jobs/${jobId}/accept`);
    loadJobs();
  };

  const reject = async (jobId) => {
    await api.patch(`/driver/jobs/${jobId}/reject`);
    loadJobs();
  };

  const badgeClass = (status) => `status-badge status-${status.replace(/\s+/g, '_')}`;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">{t('driver.availableJobs')}</h1>
        <button
          onClick={toggleOnline}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            isOnline ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <FaCircle size={10} className={isOnline ? 'text-brand-600' : 'text-gray-400'} aria-hidden="true" />
          {isOnline ? t('driver.online') : t('driver.offline')} — {t('driver.tapToToggle')}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">{t('driver.loadingJobs')}</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-500">{t('driver.noJobs')}</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-800 text-sm">
                  {job.pickupAddress.city} {arrow} {job.deliveryAddress.city}
                </span>
                <span className={badgeClass(job.status)}>{statusLabel(job.status)}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {t('driver.jobDetails', { weight: job.parcel.weightKg, priority: t(`priority.${job.priority}`), price: money(job.price) })}
              </p>

              {job.status === 'Pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => accept(job._id)}
                    className="flex-1 bg-brand-600 text-white text-sm py-1.5 rounded-lg"
                  >
                    {t('driver.accept')}
                  </button>
                  <button
                    onClick={() => reject(job._id)}
                    className="flex-1 bg-gray-100 text-gray-600 text-sm py-1.5 rounded-lg"
                  >
                    {t('driver.reject')}
                  </button>
                </div>
              ) : (
                <Link
                  to={`/driver/active/${job._id}`}
                  className="block text-center bg-brand-50 text-brand-700 text-sm py-1.5 rounded-lg font-medium"
                >
                  {t('driver.manage')} {arrow}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
