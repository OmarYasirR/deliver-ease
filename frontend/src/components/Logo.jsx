import { useI18n } from '../context/I18nContext';

// Brand mark: pin + check badge, with an English or Arabic wordmark.
export const LogoIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
    <defs>
      <linearGradient id="dl-g" x1="8" y1="0" x2="88" y2="96" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0D9488" />
        <stop offset="1" stopColor="#115E59" />
      </linearGradient>
    </defs>
    <rect width="96" height="96" rx="24" fill="url(#dl-g)" />
    <ellipse cx="48" cy="80" rx="15" ry="3.6" fill="#fff" opacity=".28" />
    <path d="M48 18C35.8 18 26 27.6 26 39.5C26 55 48 76 48 76C48 76 70 55 70 39.5C70 27.6 60.2 18 48 18Z" fill="#fff" />
    <circle cx="48" cy="39.5" r="11" fill="#FB7185" />
    <path d="M42.2 39.8L46.4 44L54.2 35.4" fill="none" stroke="#3B0713" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Logo = ({ size = 32, className = '' }) => {
  const { lang } = useI18n();
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoIcon size={size} />
      <span className="font-bold tracking-tight leading-none" style={{ fontSize: size * 0.62 }}>
        {lang === 'ar' ? (
          <>
            <span className="text-ink">دليفر</span> <span className="text-brand-500">إيز</span>
          </>
        ) : (
          <>
            <span className="text-ink">Deliver</span>
            <span className="text-brand-500 font-medium">Ease</span>
          </>
        )}
      </span>
    </span>
  );
};

export default Logo;
