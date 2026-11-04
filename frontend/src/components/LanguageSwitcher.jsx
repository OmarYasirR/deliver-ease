import { FaGlobe } from 'react-icons/fa';
import { useI18n } from '../context/I18nContext';

/**
 * Toggles between English and Arabic.
 * `floating` pins it to the top corner (used on the login/register screens).
 */
const LanguageSwitcher = ({ floating = false }) => {
  const { lang, setLang, t } = useI18n();
  const next = lang === 'ar' ? 'en' : 'ar';

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={t('common.language')}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition ${
        floating ? 'fixed top-4 end-4 z-50' : ''
      }`}
    >
      <FaGlobe aria-hidden="true" />
      {lang === 'ar' ? 'English' : 'العربية'}
    </button>
  );
};

export default LanguageSwitcher;
