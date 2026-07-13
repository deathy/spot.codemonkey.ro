# Spot — design decisions & roadmap

Working notes for `spot.codemonkey.ro`. Goals, the "why" behind choices, and what's
next. Kept in the repo as living documentation.

## Goal

Leave text/image post-it notes on a map at specific GPS coordinates, and find them
again — on the map or as a nearest-first list. Personal tool, mobile-first, fully
client-side, deployable as static content to Cloudflare.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Name | `spot.codemonkey.ro` | "a spot on the map" / "I spotted something" — map-flavored, short |
| Framework | Preact + Vite + TS | Matches `qr.codemonkey.ro`; tiny runtime, fast build |
| Map | Leaflet + raw OSM tiles | Free, keyless, no account; fine for personal scale |
| Storage | IndexedDB (`idb`) + localStorage | Blobs (photos) need IndexedDB; settings fit localStorage |
| Photos | Downscale ~1600px + JPEG ~0.8 | Keeps storage and JSON export manageable |
| Camera | `<input capture="environment">` | Native camera, zero custom camera UI for MVP |
| PWA | `vite-plugin-pwa` from the start | Installable, offline shell + runtime-cached tiles |
| Deploy | Cloudflare static-assets Worker | Same as sibling projects; SPA fallback |
| License | Apache-2.0 | Intended open-source |

## Data model

```ts
interface GpsFix { lat: number; lng: number; accuracy: number; }

interface Note {
  id: string;
  lat: number; lng: number;
  accuracy?: number;    // GPS accuracy (m) at capture
  text?: string;
  imageIds: string[];   // 0..n image blobs, keyed in the images store (MVP: 0 or 1)
  color?: string;       // post-it color / category — later
  createdAt: number;
  updatedAt: number;
}
```

- IndexedDB stores: `notes` (key `id`, index `by-updated`) + `images` (`Blob` by imageId).
- Export shape = stored shape + inlined image data URLs, versioned via `EXPORT_VERSION`.

## Architecture

```
src/
  lib/
    types.ts      data model + EXPORT_VERSION
    db.ts         IndexedDB CRUD for notes and image blobs
    geo.ts        cached location fix (never throws) + haversine distance
    image.ts      canvas downscale + JPEG re-encode of captures
    settings.ts   localStorage settings
    export.ts     JSON export (images inlined) + import/restore
    map.ts        Leaflet setup helpers, tile layer, marker icons
  components/
    MapView.tsx     map + note markers + "you are here"
    NoteList.tsx    distance-sorted list
    NoteDetail.tsx  view / edit / delete a note
    NoteForm.tsx    add/edit sheet: text + photo capture, draggable pin
    AddButton.tsx   expanding FAB → text / photo
    SettingsView.tsx export / import / clear-all
  app.tsx         view switch (Map / List / Settings) + shared state
  main.tsx        render root
```

## Privacy guardrails

- No reverse geocoding, no third-party calls beyond OSM tiles.
- No coordinates in URLs or query strings.
- Test/demo data uses only generic central-Timișoara coordinates.

## Roadmap

### MVP
- [ ] Project scaffold (Preact/Vite/TS/PWA/Cloudflare)
- [ ] IndexedDB layer + data model
- [ ] Map view with markers + current location
- [ ] Add text note at current GPS (draggable pin)
- [ ] Add photo note (camera capture, downscale)
- [ ] Note detail: view / edit / delete
- [ ] Nearest-first list view
- [ ] JSON export + import
- [ ] Settings + clear-all
- [ ] Deploy to Cloudflare

### Later
- Multiple images per note
- Post-it colors / categories / tags
- Marker clustering (`leaflet.markercluster`) for many notes
- Tap-on-map placement (not just current location)
- Search / filter notes
- Optional offline base-map tiles
- Share a single note (export one, or a link with embedded data)
