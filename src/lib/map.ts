import L from 'leaflet';

// Generic fallback view: central Timișoara. Used only until we have a real
// location or a remembered map view — never anything location-revealing.
export const DEFAULT_CENTER: L.LatLngTuple = [45.7538, 21.2257];
export const DEFAULT_ZOOM = 14;

/** Standard keyless OpenStreetMap raster tiles. */
export function tileLayer(): L.TileLayer {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
}

/** Teardrop pin for a saved note. */
export function noteIcon(): L.DivIcon {
  return L.divIcon({
    className: 'note-pin',
    html: '<div class="note-pin-dot"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24]
  });
}

/** Pulsing dot for the user's current location. */
export function locationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'here-pin',
    html: '<div class="here-dot"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}
