import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBoxOpen, FaFlagCheckered, FaMapMarkerAlt } from 'react-icons/fa';
import api from '../../api/axios';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { useI18n } from '../../context/I18nContext';

const emptyAddr = { label: '', line1: '', city: '', lat: null, lng: null };

const CreateOrder = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [pickup, setPickup] = useState(emptyAddr);
  const [delivery, setDelivery] = useState(emptyAddr);
  const [parcel, setParcel] = useState({ weightKg: '', lengthCm: '', widthCm: '', heightCm: '', instructions: '' });
  const [priority, setPriority] = useState('standard');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addressBlock = (state, setState, title, placeholder, icon) => (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
        <span className="text-brand-600" aria-hidden="true">{icon}</span>
        {title}
      </h3>
      <input
        placeholder={t('order.label')}
        className="w-full border border-gray-200 rounded-lg px-3 py-2"
        value={state.label}
        onChange={(e) => setState({ ...state, label: e.target.value })}
      />
      <AddressAutocomplete
        required
        placeholder={placeholder}
        onSelect={(p) =>
          setState((s) =>
            p ? { ...s, line1: p.line1, city: p.city, lat: p.lat, lng: p.lng } : { ...s, line1: '', city: '', lat: null, lng: null }
          )
        }
      />
      {state.lat != null ? (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <FaMapMarkerAlt aria-hidden="true" /> {state.city || t('order.unknownCity')} · {state.lat.toFixed(5)}, {state.lng.toFixed(5)}
        </p>
      ) : (
        <p className="text-xs text-gray-400">{t('order.selectSuggestion')}</p>
      )}
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (pickup.lat == null || delivery.lat == null) {
      setError(t('order.pickBothError'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        pickupAddress: pickup,
        deliveryAddress: delivery,
        parcel: {
          weightKg: Number(parcel.weightKg),
          dimensions: {
            lengthCm: Number(parcel.lengthCm) || undefined,
            widthCm: Number(parcel.widthCm) || undefined,
            heightCm: Number(parcel.heightCm) || undefined,
          },
          instructions: parcel.instructions,
        },
        priority,
      };
      const { data } = await api.post('/orders', payload);
      navigate(`/customer/track/${data.order._id}`);
    } catch (err) {
      setError(err.response?.data?.message || t('order.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">{t('order.createTitle')}</h1>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        {addressBlock(pickup, setPickup, t('order.pickupAddress'), t('order.searchPickup'), <FaBoxOpen />)}
        {addressBlock(delivery, setDelivery, t('order.deliveryAddress'), t('order.searchDelivery'), <FaFlagCheckered />)}

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">{t('order.parcelDetails')}</h3>
          <input
            required
            type="number"
            step="any"
            placeholder={t('order.weightKg')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2"
            value={parcel.weightKg}
            onChange={(e) => setParcel({ ...parcel, weightKg: e.target.value })}
          />
          <div className="flex gap-3">
            <input
              type="number"
              placeholder={t('order.lengthCm')}
              className="w-1/3 border border-gray-200 rounded-lg px-3 py-2"
              value={parcel.lengthCm}
              onChange={(e) => setParcel({ ...parcel, lengthCm: e.target.value })}
            />
            <input
              type="number"
              placeholder={t('order.widthCm')}
              className="w-1/3 border border-gray-200 rounded-lg px-3 py-2"
              value={parcel.widthCm}
              onChange={(e) => setParcel({ ...parcel, widthCm: e.target.value })}
            />
            <input
              type="number"
              placeholder={t('order.heightCm')}
              className="w-1/3 border border-gray-200 rounded-lg px-3 py-2"
              value={parcel.heightCm}
              onChange={(e) => setParcel({ ...parcel, heightCm: e.target.value })}
            />
          </div>
          <textarea
            placeholder={t('order.instructions')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2"
            rows={3}
            value={parcel.instructions}
            onChange={(e) => setParcel({ ...parcel, instructions: e.target.value })}
          />
        </div>

        <div>
          <h3 className="font-semibold text-gray-700 mb-2">{t('priority.label')}</h3>
          <div className="flex gap-3">
            {['standard', 'express', 'urgent'].map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-lg border capitalize text-sm font-medium transition ${
                  priority === p ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600'
                }`}
              >
                {t(`priority.${p}`)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60"
        >
          {loading ? t('order.placing') : t('order.place')}
        </button>
      </form>
    </div>
  );
};

export default CreateOrder;
