import { useEffect, useRef, useState } from 'preact/hooks';
import { processImage, readGpsFromExif } from '../lib/image';
import { formatDistance, haversine, SAME_LOCATION_THRESHOLD_M } from '../lib/geo';

export interface Draft {
  id?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  text: string;
  /** New/replacement image, or null to keep `existingImageUrl` (edit mode). */
  imageBlob: Blob | null;
  /** Preview URL for an already-stored image, when editing. */
  existingImageUrl?: string;
  /** True once the user cleared the existing image. */
  imageRemoved?: boolean;
  /** A location read from the added photo's EXIF that differs from the pin. */
  suggestedLocation?: { lat: number; lng: number; distanceM: number } | null;
}

interface Props {
  draft: Draft;
  mode: 'create' | 'edit';
  onChange: (patch: Partial<Draft>) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function NoteForm({ draft, mode, onChange, onSave, onCancel }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Preview for a freshly captured/selected blob; revoke on change/unmount.
  useEffect(() => {
    if (!draft.imageBlob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(draft.imageBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.imageBlob]);

  async function handleFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    try {
      // Read EXIF from the original before processing strips it, in parallel.
      const [exif, processed] = await Promise.all([
        readGpsFromExif(file),
        processImage(file)
      ]);
      const patch: Partial<Draft> = { imageBlob: processed, imageRemoved: false };
      const dist = exif ? haversine({ lat: draft.lat, lng: draft.lng }, exif) : 0;
      patch.suggestedLocation =
        exif && dist > SAME_LOCATION_THRESHOLD_M
          ? { lat: exif.lat, lng: exif.lng, distanceM: dist }
          : null;
      onChange(patch);
    } finally {
      setBusy(false);
    }
  }

  const shownImage = draft.imageBlob
    ? previewUrl
    : draft.imageRemoved
      ? null
      : (draft.existingImageUrl ?? null);

  const canSave = Boolean(draft.text.trim() || draft.imageBlob || shownImage);
  const suggested = draft.suggestedLocation;

  return (
    // No dimming backdrop: the map stays bright and interactive above the sheet
    // so you can still read street names and drag the pin while placing a note.
    <div class="form-sheet">
      <div class="sheet-handle" />
      <h2>{mode === 'create' ? 'New note' : 'Edit note'}</h2>

      <textarea
        class="note-text"
        placeholder="What's here? (optional if you add a photo)"
        value={draft.text}
        onInput={(e) => onChange({ text: (e.target as HTMLTextAreaElement).value })}
        rows={3}
        autofocus={mode === 'create' && !draft.imageBlob}
      />

      {shownImage ? (
        <div class="photo-preview">
          <img src={shownImage} alt="Note photo" />
          <div class="photo-actions">
            <button onClick={() => fileRef.current?.click()} disabled={busy}>
              Replace
            </button>
            <button
              class="danger"
              onClick={() =>
                onChange({ imageBlob: null, imageRemoved: true, suggestedLocation: null })
              }
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button class="add-photo" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Processing…' : '📷 Add photo'}
        </button>
      )}

      {/* No `capture` here: the native picker lets you take a photo OR pick one
          from the gallery (whose EXIF location we then offer below). */}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />

      {suggested && (
        <div class="loc-suggest">
          <p>
            📷 This photo was taken about {formatDistance(suggested.distanceM)} from the
            pin. Use the photo's own location?
          </p>
          <div class="loc-suggest-actions">
            <button
              class="primary"
              onClick={() =>
                onChange({
                  lat: suggested.lat,
                  lng: suggested.lng,
                  accuracy: undefined,
                  suggestedLocation: null
                })
              }
            >
              Use photo location
            </button>
            <button onClick={() => onChange({ suggestedLocation: null })}>Keep pin</button>
          </div>
        </div>
      )}

      <p class="coords">
        📍 {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
        {draft.accuracy != null && <> · ±{Math.round(draft.accuracy)} m</>}
        <span class="coords-hint">Drag the pin on the map to adjust</span>
      </p>

      <div class="sheet-buttons">
        <button onClick={onCancel}>Cancel</button>
        <button class="primary" disabled={!canSave || busy} onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}
