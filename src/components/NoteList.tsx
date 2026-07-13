import { useEffect, useMemo, useState } from 'preact/hooks';
import type { GpsFix, Note } from '../lib/types';
import { formatDistance, haversine } from '../lib/geo';
import { getImage } from '../lib/db';

interface Props {
  notes: Note[];
  location: GpsFix | null;
  onOpen: (id: string) => void;
}

/** Small square preview for a photo note; loads and revokes its own object URL. */
function Thumbnail({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objUrl: string | null = null;
    let cancelled = false;
    getImage(id).then((blob) => {
      if (blob && !cancelled) {
        objUrl = URL.createObjectURL(blob);
        setUrl(objUrl);
      }
    });
    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [id]);
  return <span class="note-thumb">{url && <img src={url} alt="" />}</span>;
}

function coords(note: Note): string {
  return `${note.lat.toFixed(5)}, ${note.lng.toFixed(5)}`;
}

export function NoteList({ notes, location, onOpen }: Props) {
  // Nearest-first when we have a location; otherwise keep newest-first order.
  const ordered = useMemo(() => {
    if (!location) return notes;
    return [...notes].sort((a, b) => haversine(location, a) - haversine(location, b));
  }, [notes, location]);

  if (notes.length === 0) {
    return (
      <div class="empty">
        <p>No notes yet.</p>
        <p class="empty-hint">
          Tap the + button, or long-press the map, to drop your first one.
        </p>
      </div>
    );
  }

  return (
    <ul class="note-list">
      {ordered.map((note) => (
        <li key={note.id}>
          <button class="note-row" onClick={() => onOpen(note.id)}>
            {note.imageIds.length ? (
              <Thumbnail id={note.imageIds[0]} />
            ) : (
              <span class="note-row-icon">📝</span>
            )}
            <span class="note-row-body">
              {note.text ? (
                <span class="note-row-text">{note.text}</span>
              ) : (
                <span class="note-row-text dim">(photo note)</span>
              )}
              <span class="note-row-meta">
                {location && (
                  <span class="note-dist">{formatDistance(haversine(location, note))}</span>
                )}
                <span class="note-coords">📍 {coords(note)}</span>
              </span>
              <span class="note-row-date">
                {new Date(note.createdAt).toLocaleString()}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
