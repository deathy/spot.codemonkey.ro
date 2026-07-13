import { useEffect, useRef, useState } from 'preact/hooks';
import { MapView } from './components/MapView';
import { NoteList } from './components/NoteList';
import { NoteDetail } from './components/NoteDetail';
import { NoteForm, type Draft } from './components/NoteForm';
import { AddButton } from './components/AddButton';
import { SettingsView } from './components/SettingsView';
import type { GpsFix, MapCamera, Note } from './lib/types';
import { getAllNotes, getImage, putNote, deleteNote, deleteImage } from './lib/db';
import { getLocation, primeLocation } from './lib/geo';
import { processImage } from './lib/image';
import { DEFAULT_CENTER } from './lib/map';

type View = 'map' | 'list' | 'settings';

export function App() {
  const [view, setView] = useState<View>('map');
  const [notes, setNotes] = useState<Note[]>([]);
  const [location, setLocation] = useState<GpsFix | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftMode, setDraftMode] = useState<'create' | 'edit'>('create');

  const photoInputRef = useRef<HTMLInputElement>(null);
  // Latest map camera, tracked in memory so new notes land where you're looking.
  const cameraRef = useRef<MapCamera | null>(null);
  // Object URL for an edited note's existing image, tracked so we can revoke it.
  const editImageUrl = useRef<string | null>(null);

  useEffect(() => {
    getAllNotes().then(setNotes);
    primeLocation();
    getLocation(Date.now()).then((fix) => fix && setLocation(fix));

    // Keep the "you are here" marker live while the app is open.
    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) =>
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          }),
        () => {
          /* ignore — we fall back to the last known fix */
        },
        { enableHighAccuracy: true, maximumAge: 10_000 }
      );
    }
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Where a new note lands: what the map is centred on, else the current fix,
  // else the generic fallback. Following the map keeps placement predictable.
  function seedLocation(): { lat: number; lng: number } {
    const cam = cameraRef.current;
    if (cam) return { lat: cam.lat, lng: cam.lng };
    if (location) return { lat: location.lat, lng: location.lng };
    return { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
  }

  function startTextNote() {
    setDraftMode('create');
    setDraft({ ...seedLocation(), text: '', imageBlob: null });
    setView('map');
  }

  function startPhotoNote() {
    photoInputRef.current?.click();
  }

  async function onPhotoPicked(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const processed = await processImage(file);
    setDraftMode('create');
    setDraft({ ...seedLocation(), text: '', imageBlob: processed });
    setView('map');
  }

  // Long-press on the map: drop a note exactly where the finger landed.
  function startNoteAt(lat: number, lng: number) {
    if (draft) return; // already placing/editing
    setDraftMode('create');
    setDraft({ lat, lng, text: '', imageBlob: null });
    setView('map');
  }

  async function startEdit(note: Note) {
    setDetailId(null);
    let existingImageUrl: string | undefined;
    const imageId = note.imageIds[0];
    if (imageId) {
      const blob = await getImage(imageId);
      if (blob) {
        existingImageUrl = URL.createObjectURL(blob);
        editImageUrl.current = existingImageUrl;
      }
    }
    setDraftMode('edit');
    setDraft({
      id: note.id,
      lat: note.lat,
      lng: note.lng,
      accuracy: note.accuracy,
      text: note.text ?? '',
      imageBlob: null,
      existingImageUrl
    });
    setView('map');
  }

  function closeDraft() {
    if (editImageUrl.current) {
      URL.revokeObjectURL(editImageUrl.current);
      editImageUrl.current = null;
    }
    setDraft(null);
  }

  async function saveDraft() {
    if (!draft) return;
    const now = Date.now();
    const existing = draft.id ? notes.find((n) => n.id === draft.id) : undefined;

    let imageIds = existing?.imageIds ?? [];
    const images = new Map<string, Blob>();
    if (draft.imageBlob) {
      const imageId = crypto.randomUUID();
      images.set(imageId, draft.imageBlob);
      imageIds = [imageId];
    } else if (draft.imageRemoved) {
      imageIds = [];
    }

    const note: Note = {
      id: draft.id ?? crypto.randomUUID(),
      lat: draft.lat,
      lng: draft.lng,
      accuracy: draft.accuracy,
      text: draft.text.trim() || undefined,
      imageIds,
      color: existing?.color,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    await putNote(note, images.size ? images : undefined);

    // Drop image blobs the note no longer references (replaced or removed).
    if (existing) {
      const orphans = existing.imageIds.filter((id) => !imageIds.includes(id));
      await Promise.all(orphans.map((id) => deleteImage(id)));
    }

    setNotes(await getAllNotes());
    closeDraft();
  }

  async function handleDelete(id: string) {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDetailId(null);
  }

  async function refreshNotes() {
    setNotes(await getAllNotes());
  }

  const detailNote = detailId ? notes.find((n) => n.id === detailId) : null;

  return (
    <div class="app">
      <header class="topbar">
        <h1>📍 Spot</h1>
      </header>

      <main class="content">
        {/* The map stays mounted across tabs so Leaflet keeps its state. */}
        <div class="map-wrap" hidden={view !== 'map'}>
          <MapView
            notes={notes}
            location={location}
            active={view === 'map'}
            placing={draft ? { lat: draft.lat, lng: draft.lng } : null}
            onPlacingMove={(lat, lng) =>
              setDraft((d) => (d ? { ...d, lat, lng, accuracy: undefined } : d))
            }
            onMarkerClick={setDetailId}
            onLongPress={startNoteAt}
            onViewChange={(cam) => (cameraRef.current = cam)}
          />
          {!draft && <AddButton onAddText={startTextNote} onAddPhoto={startPhotoNote} />}
        </div>

        {view === 'list' && (
          <NoteList notes={notes} location={location} onOpen={setDetailId} />
        )}

        {view === 'settings' && (
          <SettingsView noteCount={notes.length} onDataChanged={refreshNotes} />
        )}
      </main>

      {draft && (
        <NoteForm
          draft={draft}
          mode={draftMode}
          onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
          onSave={saveDraft}
          onCancel={closeDraft}
        />
      )}

      {detailNote && (
        <NoteDetail
          note={detailNote}
          location={location}
          onEdit={() => startEdit(detailNote)}
          onDelete={() => handleDelete(detailNote.id)}
          onClose={() => setDetailId(null)}
        />
      )}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onPhotoPicked}
      />

      <nav class="tabbar">
        <button class={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>
          <span class="tab-icon">🗺️</span>Map
        </button>
        <button class={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
          <span class="tab-icon">≣</span>Notes{notes.length ? ` (${notes.length})` : ''}
        </button>
        <button class={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>
          <span class="tab-icon">⚙</span>Settings
        </button>
      </nav>
    </div>
  );
}
