import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { FaCarSide } from 'react-icons/fa';
import { leafletLayer } from 'protomaps-leaflet';
import { useI18n } from '../context/I18nContext';

// Themed SVG pins (also avoids Leaflet's default marker images, which break under bundlers).
const pinIcon = (fill) =>
  new L.DivIcon({
    className: '',
    iconSize: [0, 0],
    html: `<svg width="30" height="38" viewBox="0 0 30 38" style="display:block;transform:translate(-50%,-100%)"><path d="M15 1C7.8 1 2 6.8 2 14c0 9.5 13 23 13 23s13-13.5 13-23C28 6.8 22.2 1 15 1z" fill="${fill}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>`,
  });

const pickupIcon = pinIcon('#0D9488'); // primary
const deliveryIcon = pinIcon('#FB7185'); // accent
const defaultIcon = pinIcon('#115E59'); // primary-dark

// Driver marker: accent badge with a car icon (react-icons rendered to static SVG markup).
const driverIcon = new L.DivIcon({
  className: '',
  iconSize: [0, 0],
  html: renderToStaticMarkup(
    <div
      style={{
        transform: 'translate(-50%, -50%)',
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: '#FB7185', // accent
        color: '#3B0713', // on-accent
        border: '3px solid #fff',
        boxShadow: '0 2px 8px rgba(15, 43, 41, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FaCarSide size={18} />
    </div>
  ),
});

const iconFor = (m) => {
  if (m.type === 'driver') return driverIcon;
  const kind = m.type || String(m.id);
  if (kind.startsWith('pickup')) return pickupIcon;
  if (kind.startsWith('delivery')) return deliveryIcon;
  return defaultIcon;
};


// Base map: self-hosted PMTiles (vector) when VITE_PMTILES_URL is set, otherwise OSM raster tiles.
const PMTILES_URL = import.meta.env.VITE_PMTILES_URL;
const MAP_FLAVOR = import.meta.env.VITE_MAP_FLAVOR || 'light'; // light | dark | white | grayscale | black
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Reads the 127-byte PMTiles v3 header with a Range request. This both verifies that the file is
// reachable (CORS + Range support) and tells us which area / zoom levels it covers.
const readPMTilesHeader = async (url, signal) => {
  const res = await fetch(url, { headers: { Range: 'bytes=0-126' }, signal });
  if (res.status !== 206) {
    res.body?.cancel?.(); // don't download the whole file if Range isn't supported
    throw new Error(
      `Range request returned HTTP ${res.status} instead of 206. The file URL is wrong, or the host/CDN does not support Range requests.`
    );
  }
  const etag = res.headers.get('etag');
  const dv = new DataView(await res.arrayBuffer());
  const magic = String.fromCharCode(...new Uint8Array(dv.buffer, 0, 7));
  if (magic !== 'PMTiles') throw new Error('The URL did not return a PMTiles file. Check VITE_PMTILES_URL.');

  // The PMTiles client sends `If-Match: <etag>` on later reads, which triggers a CORS preflight.
  // If the bucket/CDN doesn't allow that header, tiles silently fail to load (gray map), so test it here.
  if (!etag) {
    console.warn('[PMTiles] The ETag response header is not readable. Add "etag" to the CORS ExposeHeaders (and the CloudFront response headers policy).');
  } else {
    let probe;
    try {
      probe = await fetch(url, { headers: { Range: 'bytes=127-1023', 'If-Match': etag }, signal });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      throw new Error('CORS preflight blocked the "If-Match" header. Allow the headers "Range" and "If-Match" in the bucket CORS rules AND in the CloudFront response headers policy.');
    }
    if (probe.status !== 206) {
      probe.body?.cancel?.();
      throw new Error(`Follow-up Range+If-Match request returned HTTP ${probe.status} instead of 206 (ETag/CDN mismatch).`);
    }
    probe.body?.cancel?.();
  }
  return {
    minZoom: dv.getUint8(100),
    maxZoom: dv.getUint8(101),
    minLon: dv.getInt32(102, true) / 1e7,
    minLat: dv.getInt32(106, true) / 1e7,
    maxLon: dv.getInt32(110, true) / 1e7,
    maxLat: dv.getInt32(114, true) / 1e7,
  };
};

const BaseTiles = () => {
  const map = useMap();
  const { lang } = useI18n();
  const [source, setSource] = useState(PMTILES_URL ? 'checking' : 'osm'); // checking | pmtiles | osm

  // 1) Verify the PMTiles file once; fall back to OSM tiles if it can't be read (no more silent gray map).
  useEffect(() => {
    if (!PMTILES_URL) return undefined;
    const controller = new AbortController();
    readPMTilesHeader(PMTILES_URL, controller.signal)
      .then((h) => {
        console.info(
          `[PMTiles] OK. Coverage lon ${h.minLon.toFixed(2)}..${h.maxLon.toFixed(2)}, lat ${h.minLat.toFixed(2)}..${h.maxLat.toFixed(2)}, zoom ${h.minZoom}-${h.maxZoom}`
        );
        // Warn (without switching) if the current view is outside the file's area: that renders gray tiles.
        const c = map.getCenter();
        if (c.lng < h.minLon || c.lng > h.maxLon || c.lat < h.minLat || c.lat > h.maxLat) {
          console.warn(
            `[PMTiles] The map view (${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}) is outside the file's coverage. Re-extract with a bigger --bbox (order is min_lon,min_lat,max_lon,max_lat).`
          );
        }
        setSource('pmtiles');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.warn(
          `[PMTiles] Could not read ${PMTILES_URL}: ${err.message} Falling back to OpenStreetMap tiles. If this is a CORS error, fix the bucket/CDN CORS rules (docs/self-hosted-tiles.md).`
        );
        setSource('osm');
      });
    return () => controller.abort();
  }, [map]);

  // 2) Mount the vector layer once the file is verified.
  useEffect(() => {
    if (source !== 'pmtiles') return undefined;
    const layer = leafletLayer({
      url: PMTILES_URL,
      flavor: MAP_FLAVOR,
      lang: lang === 'ar' ? 'ar' : 'en', // label language follows the app language
      attribution: `${OSM_ATTRIBUTION} · <a href="https://protomaps.com">Protomaps</a>`,
    });
    let loaded = 0;
    layer.on('tileload', () => {
      if (loaded === 0) console.info('[PMTiles] Tiles are rendering.');
      loaded += 1;
    });
    layer.on('tileerror', (e) => console.warn('[PMTiles] Tile error:', e.error || e));
    layer.addTo(map);

    const watchdog = setTimeout(() => {
      if (loaded === 0) {
        console.warn(
          '[PMTiles] No tiles rendered after 5s. Open DevTools > Network, filter ".pmtiles" and look for red/blocked requests (CORS) or 412/403 errors. Also run `npm ls leaflet`: it must list ONE version (duplicates break layers).'
        );
      }
    }, 5000);

    return () => {
      clearTimeout(watchdog);
      map.removeLayer(layer);
    };
  }, [map, lang, source]);

  if (source === 'osm') {
    return <TileLayer attribution={OSM_ATTRIBUTION} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />;
  }
  return null;
};

// Recenters the map whenever `center` changes (e.g. driver moves)
const RecenterOnChange = ({ center, follow }) => {
  const map = useMap();
  useEffect(() => {
    if (follow && center) map.panTo(center);
  }, [center, follow, map]);
  return null;
};

/**
 * markers: [{ id, lat, lng, label, type: 'pickup'|'delivery'|'driver' }]
 * routeLine: [[lat,lng], ...] optional polyline
 * followId: marker id to auto-pan the map to as it moves
 */
const LiveMap = ({ markers = [], routeLine = [], center, zoom = 16, followId, height = '100%' }) => {
  const fallbackCenter = center || (markers[0] ? [markers[0].lat, markers[0].lng] : [0, 0]);
  const followMarker = markers.find((m) => m.id === followId);

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        style={{height: '100%'}}
        center={fallbackCenter} 
        zoom={zoom}
        scrollWheelZoom={true}
        maxZoom={16}
        >
        <BaseTiles />

        {routeLine.length > 1 && <Polyline positions={routeLine} pathOptions={{ color: '#0D9488', weight: 4, opacity: 0.6 }} />}

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={iconFor(m)}>
            <Popup>{m.label}</Popup>
          </Marker>
        ))}

        {followMarker && <RecenterOnChange center={[followMarker.lat, followMarker.lng]} follow />}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
