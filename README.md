# DeliverEase — Delivery & Logistics Management System

![app-logo](frontend\public\favicon.svg)


A production-ready MERN app with real-time GPS tracking via Socket.IO.

## Stack
- **Frontend:** React 18, React Router, Tailwind CSS, Leaflet/react-leaflet, socket.io-client
- **Backend:** Node.js, Express, Socket.IO
- **Database:** MongoDB + Mongoose
- **Auth:** JWT in HTTP-only cookies, RBAC (`customer`, `driver`, `admin`)

## Project structure
```
delivery-system/
  backend/
    config/db.js                 Mongo connection
    models/User.js               User + role + live location snapshot
    models/DriverProfile.js      Driver vehicle/status/active order
    models/Order.js              Order lifecycle, addresses, parcel, route
    middleware/auth.js           JWT cookie verification + RBAC guard
    middleware/errorHandler.js
    controllers/authController.js
    controllers/orderController.js   customer order CRUD + tracking
    controllers/driverController.js  accept/reject/status/online-toggle
    controllers/adminController.js   metrics, driver mgmt, manual assign
    routes/*.js
    sockets/socketHandler.js     Socket.IO auth + rooms + location relay
    server.js                    App entry (Express + Socket.IO)
  frontend/
    src/
      api/axios.js               axios instance (withCredentials)
      context/AuthContext.jsx
      context/SocketContext.jsx  connects socket.io-client once logged in
      components/ProtectedRoute.jsx
      components/Navbar.jsx
      components/LiveMap.jsx     reusable Leaflet map (markers/route/follow)
      pages/Login.jsx, Register.jsx
      pages/customer/{CreateOrder,OrderHistory,TrackOrder}.jsx
      pages/driver/{DriverDashboard,ActiveDelivery}.jsx
      pages/admin/{AdminDashboard,GlobalMap,DriverManagement}.jsx
      App.jsx                    Router + role-based route protection
```

## Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env    # fill in MONGO_URI, JWT_SECRET, CLIENT_URL
npm run dev             # starts on :5000 (Express + Socket.IO)
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev             # starts on :5173 (Vite)
```

Set `VITE_API_URL` and `VITE_SOCKET_URL` in a `frontend/.env` file if your backend
isn't on `http://localhost:5000`.

### 3. MongoDB
Any MongoDB instance works — local (`mongod`) or Atlas. Update `MONGO_URI` accordingly.

## How real-time tracking works

1. **Auth over sockets:** The Socket.IO server reads the same HTTP-only JWT cookie
   used by the REST API (`sockets/socketHandler.js`), so the browser doesn't need a
   separate socket login step.
2. **Rooms:**
   - Each order gets a room named by its `orderId`. Customers, the assigned driver,
     and admins join it via `join_order`.
   - Admins auto-join an `admins` room on connect for the global dashboard/notifications.
   - Each driver auto-joins `driver_<userId>` so admins can push direct job offers.
3. **Location flow:** The driver's browser calls `navigator.geolocation.watchPosition`
   and emits `update_location` with `{ orderId, lat, lng }`. The server persists the
   latest position on the `Order` and `User` documents, then broadcasts
   `location_changed` to the order's room and to `admins` for the global live map.
4. **Status flow:** REST endpoints (`/api/driver/jobs/:id/status`,
   `/api/admin/orders/:id/assign`, etc.) update MongoDB and then emit `status_change`
   / `order_updated` to the relevant rooms, so every connected client re-renders
   without polling.

## Creating the first admin

Admins can't register through the UI/API. After setting `MONGO_URI` (and optionally `ADMIN_NAME`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`) in `backend/.env`, run from the project root:

```bash
npm run seed:admin
npm run seed:admin -- --email=boss@example.com --name="Boss"      # flags override env vars
npm run seed:admin -- --email=someone@example.com --promote        # make an existing user admin
npm run seed:admin -- --email=boss@example.com --reset-password    # set a new password
```

It is safe to re-run (it never creates duplicates). With no password set, a random one is generated
and printed once. Log in at `/login` and you'll land on the admin dashboard.

## Address autocomplete (Photon / OpenStreetMap, free, no API key)

`components/AddressAutocomplete.jsx` is a debounced, keyboard-navigable suggestions dropdown. It
calls the backend `GET /api/geocode/search?q=...` (login required), which proxies
[Photon](https://photon.komoot.io), a free OpenStreetMap-based geocoder built for search-as-you-type,
and caches results for 10 minutes. Picking a suggestion fills `line1`, `city`, `lat`, `lng`;
editing the text afterwards clears the coordinates so a stale location is never submitted.

- No API key or billing. Map tiles are OpenStreetMap too.
- The public Photon instance is fair-use only. For production, self-host Photon
  (https://github.com/komoot/photon) and set `GEOCODER_URL` in `backend/.env`.
- Photon supports `en`, `de`, `fr`, `it` result languages; for Arabic it returns local-language names.
- Keep the "© OpenStreetMap contributors" credit visible (already shown under the suggestions and on the map).

## Real routing (OSRM)

`backend/utils/osrm.js` calls OSRM's `/route/v1/driving` endpoint to get an actual driving
route (turn-by-turn geometry, distance, duration) between pickup and delivery, instead of a
straight line. `orderController.createOrder` calls this when an order is placed and stores
the result on `order.route` (`waypoints`, `distanceMeters`, `durationSeconds`, `source`).
Pricing now factors in real distance (`PER_KM_RATE` in `orderController.js`).

- Defaults to the public demo server (`https://router.project-osrm.org`) — fine for
  development, but it's rate-limited and has no uptime guarantee.
- For production, self-host OSRM (Docker image + your own OSM extract) or use a paid
  routing provider, and point `OSRM_BASE_URL` at it in `backend/.env`.
- If the OSRM call fails for any reason, order creation still succeeds — it falls back to
  a straight line between the two points (`route.source: 'straight_line'`) so the app never
  blocks on a third-party outage.

## Arabic / RTL language switch

A 🌐 toggle (navbar, and top corner on login/register) switches between English and Arabic.

- `src/i18n/translations.js` — flat `en` / `ar` string maps (`{placeholder}` interpolation).
- `src/context/I18nContext.jsx` — `useI18n()` gives `t()`, `lang`, `setLang`, `statusLabel()`,
  `formatDate()`, `money()` and a direction-aware `arrow`. It sets `<html lang dir>`, so Tailwind/flexbox
  layouts mirror automatically for RTL. The choice persists in `localStorage` (`dls_lang`) and defaults
  to the browser language.
- Order statuses/priorities are stored in English in MongoDB and translated only for display.
- Address suggestions use the selected language where Photon supports it (see above).
- Add another language by adding a key to `translations.js` (and a locale in `I18nContext.jsx`).
- Not yet translated: server error messages returned by the API (shown as-is, in English).

## Notes / next steps for a real deployment
- Add refresh-token rotation and rate limiting on `/api/auth/*`.
- Add server-side pagination on `/api/admin/orders` and `/api/orders/my` for scale.
- Consider caching/re-using OSRM results and adding retry/backoff if you self-host it.
