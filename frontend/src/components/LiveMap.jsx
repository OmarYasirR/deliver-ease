import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { FaCarSide } from 'react-icons/fa';
import { leafletLayer } from 'protomaps-leaflet';
import { useI18n } from '../context/I18nContext';

const pinIcon = (fill) =>
  new L.DivIcon({
    className: '',
    iconSize: [0, 0],
    html: `<svg width="30" height="38" viewBox="0 0 30 38" style="display:block;transform:translate(-50%,-100%)"><path d="M15 1C7.8 1 2 6.8 2 14c0 9.5 13 23 13 23s13-13.5 13-23C28 6.8 22.2 1 15 1z" fill="${fill}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>`,
  });

const pickupIcon = pinIcon('#0D9488');
const deliveryIcon = pinIcon('#FB7185');
const defaultIcon = pinIcon('#115E59');

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
        background: '#FB7185',
        color: '#3B0713',
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


const dbg = (patch) => {
  window.__mapDebug = { ...(window.__mapDebug || {}), ...patch };
};
const bump = (key) => dbg({ [key]: ((window.__mapDebug || {})[key] || 0) + 1 });


const PMTILES_URL = import.meta.env.VITE_PMTILES_URL;
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';


const readPMTilesHeader = async (url, signal) => {
  const res = await fetch(url, { headers: { Range: 'bytes=0-126' }, signal });
  if (res.status !== 206) {
    res.body?.cancel?.(); 
    throw new Error(
      `Range request returned HTTP ${res.status} instead of 206. The file URL is wrong, or the host/CDN does not support Range requests.`
    );
  }
  const etag = res.headers.get('etag');
  const dv = new DataView(await res.arrayBuffer());
  const magic = String.fromCharCode(...new Uint8Array(dv.buffer, 0, 7));
  if (magic !== 'PMTiles') throw new Error('The URL did not return a PMTiles file. Check VITE_PMTILES_URL.');

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

const tileHasContent = (el) => {
  if (!el) return null;
  const canvases = el.tagName === 'CANVAS' ? [el] : Array.from(el.querySelectorAll?.('canvas') || []);
  if (!canvases.length) return null;
  try {
    for (const cv of canvases) {
      const ctx = cv.getContext('2d');
      if (!ctx || !cv.width || !cv.height) continue;
      for (let i = 1; i <= 4; i += 1) {
        for (let j = 1; j <= 4; j += 1) {
          const px = ctx.getImageData(Math.floor((cv.width * i) / 5), Math.floor((cv.height * j) / 5), 1, 1).data;
          if (px[3] > 0) return true;
        }
      }
    }
    return false;
  } catch {
    return null;
  }
};

const BaseTiles = () => {
  const map = useMap();
  const { lang } = useI18n();
  const [source, setSource] = useState(PMTILES_URL ? 'checking' : 'osm');
  useEffect(() => {
    dbg({ source, pmtilesUrl: PMTILES_URL || '(not set: using OSM tiles)' });
  }, [source]);

  useEffect(() => {
    if (!PMTILES_URL) return undefined;
    const controller = new AbortController();
    readPMTilesHeader(PMTILES_URL, controller.signal)
      .then((h) => {
        dbg({ coverage: `lon ${h.minLon.toFixed(2)}..${h.maxLon.toFixed(2)}, lat ${h.minLat.toFixed(2)}..${h.maxLat.toFixed(2)}, z${h.minZoom}-${h.maxZoom}` });
        console.info(
          `[PMTiles] OK. Coverage lon ${h.minLon.toFixed(2)}..${h.maxLon.toFixed(2)}, lat ${h.minLat.toFixed(2)}..${h.maxLat.toFixed(2)}, zoom ${h.minZoom}-${h.maxZoom}`
        );
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
        dbg({ error: err.message });
        console.warn(
          `[PMTiles] Could not read ${PMTILES_URL}: ${err.message} Falling back to OpenStreetMap tiles. If this is a CORS error, fix the bucket/CDN CORS rules (docs/self-hosted-tiles.md).`
        );
        setSource('osm');
      });
    return () => controller.abort();
  }, [map]);


  useEffect(() => {
    if (source !== 'pmtiles') return undefined;
    const layer = leafletLayer({
      url: PMTILES_URL,
      flavor: MAP_FLAVOR,
      lang: lang === 'ar' ? 'ar' : 'en',
      attribution: `${OSM_ATTRIBUTION} · <a href="https://protomaps.com">Protomaps</a>`,
    });
    let loaded = 0;
    dbg({ tilesLoaded: 0, tileErrors: 0 });
    let measured = 0;
    let withContent = 0;
    layer.on('tileload', (e) => {
      if (loaded === 0) console.info('[PMTiles] Tiles are rendering.');
      loaded += 1;
      bump('tilesLoaded');
      const has = tileHasContent(e.tile);
      if (has !== null) {
        measured += 1;
        if (has) withContent += 1;
      }
    });
    layer.on('tileerror', (e) => {
      bump('tileErrors');
      console.warn('[PMTiles] Tile error:', e.error || e);
    });
    layer.addTo(map);

    const watchdog = setTimeout(() => {
      if (loaded === 0) {
        console.warn(
          '[PMTiles] No tiles rendered after 5s. Open DevTools > Network, filter ".pmtiles" and look for red/blocked requests (CORS) or 412/403 errors. Also run `npm ls leaflet`: it must list ONE version (duplicates break layers).'
        );
      }
    }, 5000);
   
    const blankWatch = setTimeout(() => {
      if (measured >= 3 && withContent === 0) {
        console.warn(
          '[PMTiles] Tiles loaded but are all blank (the file has no drawable basemap data for this view, or its schema does not match protomaps-leaflet). Falling back to OpenStreetMap tiles.'
        );
        dbg({ error: 'all PMTiles tiles are blank, using OSM' });
        setSource('osm');
      }
    }, 6000);

    return () => {
      clearTimeout(watchdog);
      clearTimeout(blankWatch);
      map.removeLayer(layer);
    };
  }, [map, lang, source]);

  if (source === 'osm') {
    return (
      <TileLayer
        attribution={OSM_ATTRIBUTION}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{ tileload: () => bump('tilesLoaded'), tileerror: () => bump('tileErrors') }}
      />
    );
  }
  return null;
};


const MapDebug = ({ markers, routeLen }) => {
  const map = useMap();
  const [, tick] = useState(0);
  useEffect(() => {
    const refresh = () => tick((n) => n + 1);
    map.on('moveend zoomend resize', refresh);
    const id = setInterval(refresh, 1000);
    return () => {
      map.off('moveend zoomend resize', refresh);
      clearInterval(id);
    };
  }, [map]);

  const size = map.getSize();
  const c = map.getCenter();
  const b = map.getBounds();
  const d = window.__mapDebug || {};
  const lines = [
    `container: ${size.x} x ${size.y}px   zoom: ${map.getZoom()}`,
    `center: ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`,
    `markers: ${markers.length}  route points: ${routeLen}`,
    ...markers.map((m) => `  ${m.id}: ${m.lat?.toFixed?.(4)}, ${m.lng?.toFixed?.(4)}  ${b.contains([m.lat, m.lng]) ? 'in view' : 'OUT OF VIEW'}`),
    `basemap: ${d.source}  tiles ok: ${d.tilesLoaded || 0}  errors: ${d.tileErrors || 0}`,
    `file: ${d.pmtilesUrl}`,
    d.coverage ? `coverage: ${d.coverage}` : null,
    d.error ? `ERROR: ${d.error}` : null,
  ].filter(Boolean);

  return (
    <div
      style={{
        position: 'absolute', left: 8, bottom: 28, zIndex: 1000, pointerEvents: 'none', maxWidth: 'calc(100% - 16px)',
        background: 'rgba(15,43,41,.88)', color: '#fff', font: '11px/1.45 ui-monospace, Consolas, monospace',
        padding: '6px 8px', borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all', direction: 'ltr', textAlign: 'left',
      }}
    >
      {lines.join('\n')}
    </div>
  );
};


const FitToContent = ({ points, fitKey, padding }) => {
  const map = useMap();
  const latest = useRef(points);
  latest.current = points;
  const touched = useRef(false);

  const fit = useCallback(() => {
    const pts = latest.current;
    const size = map.getSize();
    if (!pts.length || !size.x || !size.y) return;
    map.fitBounds(L.latLngBounds(pts), { padding: [padding, padding], maxZoom: 16, animate: false });
  }, [map, padding]);

  useEffect(() => {
    touched.current = false;
    map.invalidateSize(); 
    fit();
  }, [fitKey, fit, map]);

  useEffect(() => {
    const el = map.getContainer();
    const markTouched = () => {
      touched.current = true;
    };
    el.addEventListener('pointerdown', markTouched);
    el.addEventListener('wheel', markTouched, { passive: true });

    let raf;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        map.invalidateSize();
        if (!touched.current) fit();
      });
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', markTouched);
      el.removeEventListener('wheel', markTouched);
    };
  }, [map, fit]);

  return null;
};


const KeepInView = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat == null || lng == null) return;
    if (!map.getBounds().pad(-0.15).contains([lat, lng])) map.panTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
};

const MAP_DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('mapdebug');

const isPoint = (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]);


const LiveMap = ({
  markers = [],
  routeLine = [],
  center,
  zoom = 13,
  followId,
  fit = true,
  fitPadding = 48,
  fitKey,
  height = '100%',
}) => {
  const fallbackCenter = center || (markers[0] ? [markers[0].lat, markers[0].lng] : [0, 0]);
  const followMarker = markers.find((m) => m.id === followId);

  const points = [...markers.map((m) => [m.lat, m.lng]), ...routeLine].filter(isPoint);
  const autoKey =
    markers
      .filter((m) => m.type !== 'driver')
      .map((m) => `${m.id}:${m.lat},${m.lng}`)
      .join('|') + `#${routeLine.length}`;

  return (

    <div className="isolate" style={{ height, width: '100%' }}>
      <MapContainer 
      center={fallbackCenter} 
      zoom={zoom} 
      maxZoom={14} 
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
        <BaseTiles />

        {routeLine.length > 1 && <Polyline positions={routeLine} pathOptions={{ color: '#0D9488', weight: 4, opacity: 0.6 }} />}

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={iconFor(m)}>
            <Popup>{m.label}</Popup>
          </Marker>
        ))}

        {fit && <FitToContent points={points} fitKey={`${fitKey ?? ''}|${autoKey}`} padding={fitPadding} />}
        {followMarker && <KeepInView lat={followMarker.lat} lng={followMarker.lng} />}
        {MAP_DEBUG && <MapDebug markers={markers} routeLen={routeLine.length} />}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
