import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useI18n } from '../context/I18nContext';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 400;

const AddressAutocomplete = ({ placeholder, onSelect, required }) => {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState(false);
  const wrapRef = useRef(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (selected || query.trim().length < MIN_CHARS) {
      setResults([]); setStatus('idle'); return undefined;
    }
    const id = ++reqId.current;
    setStatus('loading');
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/geocode/search', { params: { q: query.trim(), lang } });
        if (id !== reqId.current) return;
        setResults(data.results); setStatus('done'); setActive(-1); setOpen(true);
      } catch {
        if (id !== reqId.current) return;
        setResults([]); setStatus('error'); setOpen(true);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, lang, selected]);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (r) => {
    reqId.current++;
    setSelected(true); setQuery(r.label); setOpen(false); setResults([]); setStatus('idle');
    onSelect(r);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    if (selected) { setSelected(false); onSelect(null); }
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown')      { e.preventDefault(); setActive((i) => (i + 1) % results.length); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => (i <= 0 ? results.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(results[active]); }
    else if (e.key === 'Escape')    { setOpen(false); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        required={required}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className="field"
      />

      {open && (status === 'done' || status === 'error') && (
        <ul
          role="listbox"
          className="absolute z-[1000] inset-x-0 mt-1 max-h-64 overflow-auto bg-surface border border-line rounded-lg shadow-card text-sm"
        >
          {status === 'error' && <li className="px-3 py-2 text-danger-700">{t('places.error')}</li>}
          {status === 'done' && results.length === 0 && (
            <li className="px-3 py-2 text-muted">{t('places.noResults')}</li>
          )}
          {results.map((r, i) => (
            <li
              key={r.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(r)}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 cursor-pointer ${
                i === active ? 'bg-primary-50 text-primary-700' : 'text-ink hover:bg-gray-50'
              }`}
            >
              {r.label}
            </li>
          ))}
        </ul>
      )}

      {status === 'loading' && <p className="text-xs text-muted mt-1">{t('places.searching')}</p>}
      {open && status === 'done' && (
        <p className="text-[10px] text-muted/80 mt-1">© OpenStreetMap contributors</p>
      )}
    </div>
  );
};

export default AddressAutocomplete;