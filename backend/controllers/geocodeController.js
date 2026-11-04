const axios = require('axios');
const asyncHandler = require('express-async-handler');

// Photon (https://photon.komoot.io) is a free, key-less geocoder built on OpenStreetMap data
// and designed for search-as-you-type. The public instance is fair-use only: for production
// traffic self-host Photon and point GEOCODER_URL at it.
const GEOCODER_URL = process.env.GEOCODER_URL || 'https://photon.komoot.io';
const PHOTON_LANGS = ['en', 'de', 'fr', 'it']; // Photon has no Arabic; it falls back to local names

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map(); // key -> { at, results }

const buildResult = (f) => {
  const p = f.properties || {};
  const [lng, lat] = f.geometry.coordinates;
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const city = p.city || p.district || p.county || p.state || '';
  const line1 = street || p.name || city;
  const label = [...new Set([p.name, street, p.district, p.city, p.state, p.country].filter(Boolean))].join(', ');
  return { id: `${p.osm_type || ''}${p.osm_id || ''}-${lat}-${lng}`, label, line1, city, lat, lng };
};

// @desc  Address autocomplete (proxy to Photon, with small in-memory cache)
// @route GET /api/geocode/search?q=...&lang=en
const searchAddress = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.json({ success: true, results: [] });

  const lang = PHOTON_LANGS.includes(req.query.lang) ? req.query.lang : undefined;
  const key = `${lang || ''}|${q.toLowerCase()}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.json({ success: true, results: hit.results });
  }

  try {
    const { data } = await axios.get(`${GEOCODER_URL}/api/`, {
      params: { q, limit: 6, lang },
      headers: { 'User-Agent': 'DeliverEase/1.0' },
      timeout: 5000,
    });

    const results = (data.features || []).filter((f) => f.geometry?.coordinates).map(buildResult);

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), results });

    res.json({ success: true, results });
  } catch (err) {
    console.warn('Geocoder lookup failed:', err.message);
    res.status(502);
    throw new Error('Address search is temporarily unavailable');
  }
});

module.exports = { searchAddress };
