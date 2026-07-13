import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'preact/hooks';
import type { GpsFix, Note, Settings } from '../lib/types';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  locationIcon,
  noteIcon,
  tileLayer
} from '../lib/map';

interface Props {
  notes: Note[];
  location: GpsFix | null;
  /** When set, a draggable pin is shown for placing/editing a note. */
  placing: { lat: number; lng: number } | null;
  onPlacingMove: (lat: number, lng: number) => void;
  onMarkerClick: (id: string) => void;
  settings: Settings;
  onViewChange: (view: { lat: number; lng: number; zoom: number }) => void;
}

export function MapView({
  notes,
  location,
  placing,
  onPlacingMove,
  onMarkerClick,
  settings,
  onViewChange
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const notesLayerRef = useRef<L.LayerGroup | null>(null);
  const hereMarkerRef = useRef<L.Marker | null>(null);
  const placingMarkerRef = useRef<L.Marker | null>(null);
  const didInitialCenter = useRef(false);

  // Latest callback without forcing map re-init.
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onPlacingMoveRef = useRef(onPlacingMove);
  onPlacingMoveRef.current = onPlacingMove;

  // One-time map setup.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start = settings.lastMapView;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      start ? [start.lat, start.lng] : DEFAULT_CENTER,
      start ? start.zoom : DEFAULT_ZOOM
    );
    if (start) didInitialCenter.current = true;
    tileLayer().addTo(map);
    notesLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on('moveend', () => {
      const c = map.getCenter();
      onViewChangeRef.current({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    });

    // Leaflet needs a size recalculation once laid out in a flex container.
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          icon: noteIcon(),
          draggable: true,
          zIndexOffset: 1000
        }).addTo(map);
        marker.on('dragend', () => {
          const p = marker.getLatLng();
          onPlacingMoveRef.current(p.lat, p.lng);
        });
        placingMarkerRef.current = marker;
        map.panTo([placing.lat, placing.lng]);
      } else {
        placingMarkerRef.current.setLatLng([placing.lat, placing.lng]);
      }
    } else if (placingMarkerRef.current) {
      placingMarkerRef.current.remove();
      placingMarkerRef.current = null;
    }
  }, [placing]);

  return <div ref={containerRef} class="map" />;
}
