# Hytta

Self-hosted Remix + SQLite app for cabin management.

## Features

- Auth:
  - Local email/password auth (Argon2id)
  - Forgot password via SMTP reset link
  - Public dashboard is read-only by default
  - Logged-in users get full write access
  - Logged-in users can create additional users
- Checklist:
  - Seasonal lists (`winter` / `summer`) with date-based default
  - Local-only ticking (LocalStorage)
  - Add, edit, delete checklist templates (logged-in users)
  - Drag-and-drop reordering (logged-in users, persisted)
- Huskeliste (Reminder list):
  - Shared items in SQLite
  - Add/remove items (logged-in users)
  - Drag-and-drop reordering (logged-in users, persisted)
- Useful links:
  - Shared links in SQLite
  - Add/edit/delete (logged-in users)
  - Drag-and-drop reordering (logged-in users, persisted)
- FAQ:
  - Compact FAQ section at the bottom of the dashboard
  - Search matches both question and answer text
  - Single-language entry is supported (missing translation is auto-filled)
  - Add/edit/delete entries (logged-in users), read-only for anonymous users
  - Drag-and-drop reordering (logged-in users, persisted)
- UI:
  - Norwegian-first UX (language switcher currently hidden)
  - Configurable cabin subtitle via `CABIN_LABEL`
  - Weather card from Yr (temperature, condition, wind, precipitation, cloud cover, humidity)
  - Weather card is clickable and opens the corresponding Yr page
  - Light/dark mode toggle (moon/sun icon)
  - Global text-size controls (`A-` / `A+`) for accessibility
  - Responsive 3-column dashboard layout on desktop
- Ops:
  - Health endpoint: `/healthz`
  - SQLite WAL mode + persistent volume for Podman

## Local dev

1. Copy `.env.example` to `.env` and adjust values.
2. Install deps: `npm install`
3. Start dev server: `npm run dev`
4. Access:
   - Local machine: `http://localhost:3000`
   - From another device on LAN: `http://<HOST_IP>:3000`

Notes:
- First login can be bootstrapped with `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`.
- After first login, create additional users from the `Users` modal.
- Weather requires `WEATHER_LAT` and `WEATHER_LON` in `.env`.

## Podman deploy

1. Configure `.env` for production (`SESSION_SECRET`, SMTP, `DOMAIN`, `ACME_EMAIL`).
2. Run: `podman-compose up --build -d`
3. Persistent data is stored in the `hytta_data` volume.
4. App is exposed through Caddy on ports `80` and `443` (host).

## SQLite backup

Example backup command (host side):

```bash
podman exec -it <app-container> sqlite3 /data/hytta.db ".backup '/data/hytta-backup.db'"
```
