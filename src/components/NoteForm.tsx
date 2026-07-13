import { useEffect, useRef, useState } from 'preact/hooks';
import { processImage } from '../lib/image';

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
      const processed = await processImage(file);
      onChange({ imageBlob: processed, imageRemoved: false });
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
                onClick={() => onChange({ imageBlob: null, imageRemoved: true })}
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

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleFile}
        />

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
