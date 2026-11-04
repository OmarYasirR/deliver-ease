let loadPromise = null;

/**
 * Loads the Google Maps JavaScript API (with the Places library) exactly once,
 * no matter how many components call this. Returns a promise that resolves
 * once `window.google.maps.places` is available.
 */
export function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(
      new Error('Missing VITE_GOOGLE_MAPS_API_KEY — set it in frontend/.env to enable address autocomplete.')
    );
  }

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = '__onGoogleMapsLoaded';
    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google);
    };

    let lang = 'en';
    try {
      lang = localStorage.getItem('dls_lang') || (navigator.language?.startsWith('ar') ? 'ar' : 'en');
    } catch {
      /* ignore */
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=${lang}&callback=${callbackName}&loading=async`;
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
