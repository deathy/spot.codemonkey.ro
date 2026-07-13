# Spot — GPS Post-It Notes

Drop **text and photo notes** at real-world coordinates and browse them on a map
or as a distance-sorted list. An interesting building, a sign, a trash-heap that
needs cleaning up — mark the spot, add a note, find it again later.

**Live:** https://spot.codemonkey.ro

## Principles

- **Mobile-first.** Location is the whole point; the UI is built for a phone in one hand.
- **Pure client-side.** No backend, no accounts, no analytics, no tracking.
- **Privacy by default.** Your notes, photos and locations live in your browser's
  storage and never leave the device unless *you* export them. The only network
  calls are for map tiles from OpenStreetMap.
- **Yours to keep.** One-tap JSON export (with images inlined) for backup or moving
  devices, and import to restore.
- **Offline-capable.** Installable PWA; the app shell works offline and visited map
  tiles are cached.

## How it works

- **Add a note** — the expanding **+** button offers a *Text note* or a *Photo note*.
  Both anchor to your current GPS location; drag the pin to fine-tune before saving.
  A photo note opens your device camera.
- **Browse on the map** — every note is a marker; tap one to view, edit or delete it.
- **Browse as a list** — notes are ordered **nearest-first** from your current
  location (falls back to newest-first when location is unavailable).
- **Settings** — export everything as JSON, import a backup, or clear all data.

## Storage model

- **IndexedDB** holds notes and image blobs (photos can be several MB — too big for
  `localStorage`). Photos are downscaled (~1600px longest edge) and JPEG-compressed
  before storing.
- **localStorage** holds only lightweight settings.

Nothing is uploaded. Clearing your browser data for this site erases everything,
so use **Export** to keep a backup.

## Tech stack

- [Preact](https://preactjs.com/) + [Vite](https://vitejs.dev/) + TypeScript
- [Leaflet](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) tiles (keyless)
- [`idb`](https://github.com/jakearchibald/idb) for IndexedDB
- [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) for the installable/offline PWA
- Deployed as static assets on Cloudflare (Workers/Pages)

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
```

> Geolocation and camera require a **secure context**. `localhost` counts as secure;
> to test from a phone on your LAN use an HTTPS tunnel (or the deployed site).

See [PLAN.md](PLAN.md) for the design decisions and roadmap.

## Attribution

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

## License

[Apache-2.0](LICENSE) © Cristian Vat
