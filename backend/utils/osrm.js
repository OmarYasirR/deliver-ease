const axios = require('axios');

// Public OSRM demo server. For production, self-host OSRM or use a paid tier —
// the demo server has no SLA and shouldn't be relied on for real traffic.
const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

/**
 * Fetches a real driving route between two points from OSRM.
 * @param {{lat:number,lng:number}} origin
 * @param {{lat:number,lng:number}} destination
 * @returns {Promise<{waypoints:number[][], distanceMeters:number, durationSeconds:number} | null>}
 *   waypoints is an array of [lat, lng] pairs (already converted from OSRM's [lng, lat] order),
 *   ready to hand straight to the frontend Polyline. Returns null on any failure so callers
 *   can fall back to a straight line instead of failing the whole order creation.
 */
const getDrivingRoute = async (origin, destination) => {
  try {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}`;

    const { data } = await axios.get(url, {
      params: { overview: 'full', geometries: 'geojson' },
      timeout: 5000,
    });

    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return null;

    // GeoJSON coordinates are [lng, lat] — flip to [lat, lng] for Leaflet
    const waypoints = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    return {
      waypoints,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch (err) {
    console.warn('OSRM route lookup failed, falling back to straight line:', err.message);
    return null;
  }
};

module.exports = { getDrivingRoute };
