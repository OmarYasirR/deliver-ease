import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import translations from '../i18n/translations';

export const LANG_STORAGE_KEY = 'dls_lang';
const LOCALES = { en: 'en-US', ar: 'ar-EG' };
const SUPPORTED = Object.keys(translations);

const I18nContext = createContext(null);

const getInitialLang = () => {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
};

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(getInitialLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const locale = LOCALES[lang];

  // Keep <html lang/dir> in sync — this is what flips the whole layout for RTL
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setLangState(next);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let str = translations[lang][key] ?? translations.en[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replaceAll(`{${k}}`, String(v));
        });
      }
      return str;
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      dir,
      locale,
      isRTL: dir === 'rtl',
      setLang,
      t,
      arrow: dir === 'rtl' ? '←' : '→',
      statusLabel: (status) => t(`status.${status}`),
      formatDate: (d) => new Date(d).toLocaleString(locale),
      money: (n) =>
        new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(Number(n) || 0),
    }),
    [lang, dir, locale, setLang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// Safe English fallback so a missing <I18nProvider> never crashes the UI
// (it is mounted in main.jsx; the warning below helps catch a wrong setup).
const fallbackT = (key, vars) => {
  let str = translations.en[key] ?? key;
  if (vars) Object.entries(vars).forEach(([k, v]) => { str = str.replaceAll(`{${k}}`, String(v)); });
  return str;
};
const fallbackValue = {
  lang: 'en',
  dir: 'ltr',
  locale: 'en-US',
  isRTL: false,
  setLang: () => {},
  t: fallbackT,
  arrow: '→',
  statusLabel: (status) => fallbackT(`status.${status}`),
  formatDate: (d) => new Date(d).toLocaleString('en-US'),
  money: (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0),
};
let warned = false;

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx && !warned) {
    warned = true;
    console.warn('useI18n(): <I18nProvider> is missing. Wrap the app with it in src/main.jsx.');
  }
  return ctx ?? fallbackValue;
};
