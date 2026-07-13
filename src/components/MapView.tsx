import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'preact/hooks';
import type { GpsFix, MapCamera, Note } from '../lib/types';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  locationIcon,
  noteIcon,
  placingIcon,
  tileLayer
} from '../lib/map';

interface Props {
  notes: Note[];
  location: GpsFix | null;
  /** Whether the map tab is currently visible (drives size recalculation). */
  active: boolean;
  /** When set, a draggable pin is shown for placing/editing a note. */
  placing: { lat: number; lng: number } | null;
  onPlacingMove: (lat: number, lng: number) => void;
  onMarkerClick: (id: string) => void;
  /** Long-press (or right-click) on the map to drop a note there. */
  onLongPress: (lat: number, lng: number) => void;
  onViewChange: (camera: MapCamera) => void;
}

export function MapView({
  notes,
  location,
  active,
  placing,
  onPlacingMove,
  onMarkerClick,
  onLongPress,
  onViewChange
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const notesLayerRef = useRef<L.LayerGroup | null>(null);
  const hereMarkerRef = useRef<L.Marker | null>(null);
  const placingMarkerRef = useRef<L.Marker | null>(null);
  const didInitialCenter = useRef(false);

  // Keep latest callbacks without forcing the map to re-initialise.
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onPlacingMoveRef = useRef(onPlacingMove);
  onPlacingMoveRef.current = onPlacingMove;
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  // One-time map setup.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      DEFAULT_CENTER,
      DEFAULT_ZOOM
    );
    tileLayer().addTo(map);
    notesLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on('moveend', () => {
      const c = map.getCenter();
      onViewChangeRef.current({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    });

    // Long-press on touch fires 'contextmenu' in Leaflet; also covers right-click.
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      onLongPressRef.current(e.latlng.lat, e.latlng.lng);
    });

    // Recalculate whenever the container's box changes (layout, safe-area insets,
    // rotation). Without this Leaflet keeps a stale size and only paints tiles for
    // part of the viewport after panning/zooming.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    // And once more after first paint, when flex layout has settled.
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fix the size when the map tab becomes visible again (it has zero size while
  // hidden with `display:none`).
  useEffect(() => {
    if (active && mapRef.current) {
      requestAnimationFrame(() => mapRef.current?.invalidateSize());
    }
  }, [active]);

  // Render note markers whenever the set changes.
  useEffect(() => {
    const layer = notesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const note of notes) {
      const marker = L.marker([note.lat, note.lng], { icon: noteIcon() });
      marker.on('click', () => onMarkerClickRef.current(note.id));
      layer.addLayer(marker);
    }
  }, [notes]);

  // Current-location marker; center on it the first time we get a fix.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    if (!hereMarkerRef.current) {
      hereMarkerRef.current = L.marker([location.lat, location.lng], {
        icon: locationIcon(),
        interactive: false,
        keyboard: false
      }).addTo(map);
    } else {
      hereMarkerRef.current.setLatLng([location.lat, location.lng]);
    }
    if (!didInitialCenter.current) {
      didInitialCenter.current = true;
      map.setView([location.lat, location.lng], 16);
    }
  }, [location]);

  // Draggable placing pin lifecycle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (placing) {
      if (!placingMarkerRef.current) {
        const marker = L.marker([placing.lat, placing.lng], {
          icon: placingIcon(),
          draggable: true,
          zIndexOffset: 1000
        }).addTo(map);
        marker.on('dragend', () => {
          const p = marker.getLatLng();
          onPlacingMoveRef.current(p.lat, p.lng);
        });
        placingMarkerRef.current = marker;
      } else {
        placingMarkerRef.current.setLatLng([placing.lat, placing.lng]);
      }
      // Keep the pin on screen. It's already in view after a drag; this matters
      // when placing/editing off-screen or jumping to a photo's EXIF location.
      if (!map.getBounds().contains([placing.lat, placing.lng])) {
        map.panTo([placing.lat, placing.lng]);
      }
    } else if (placingMarkerRef.current) {
      placingMarkerRef.current.remove();
      placingMarkerRef.current = null;
    }
  }, [placing]);

  return <div ref={containerRef} class="map" />;
}
