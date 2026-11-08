import { FaGlobe } from 'react-icons/fa';
import { useI18n } from '../context/I18nContext';

/**
 * Toggles between English and Arabic.
 * `floating` pins it to the top corner (used on the login/register screens).
 */
const LanguageSwitcher = ({ floating = false, compact = false }) => {
  const { lang, setLang, t } = useI18n();
  const next = lang === 'ar' ? 'en' : 'ar';
  const nextLabel = next === 'ar' ? 'العربية' : 'English';

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={`${t('common.language')}: ${nextLabel}`}
      title={nextLabel}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        compact ? 'min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:px-3 sm:py-1.5' : 'px-3 py-1.5'
      } ${floating ? 'fixed top-4 end-4 z-50' : ''}`}
    >
      <FaGlobe aria-hidden="true" />
      <span className={compact ? 'hidden sm:inline' : ''}>{lang === 'ar' ? 'English' : 'العربية'}</span>
    </button>
  );
};

export default LanguageSwitcher;
