import { useMemo } from 'preact/hooks';
import type { GpsFix, Note } from '../lib/types';
import { formatDistance, haversine } from '../lib/geo';

interface Props {
  notes: Note[];
  location: GpsFix | null;
  onOpen: (id: string) => void;
}

function preview(text?: string): string {
  if (!text) return '(photo note)';
  const trimmed = text.trim();
  return trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed;
}

export function NoteList({ notes, location, onOpen }: Props) {
  // Nearest-first when we have a location; otherwise keep newest-first order.
  const ordered = useMemo(() => {
    if (!location) return notes;
    return [...notes].sort(
      (a, b) => haversine(location, a) - haversine(location, b)
    );
  }, [notes, location]);

  if (notes.length === 0) {
    return (
      <div class="empty">
        <p>No notes yet.</p>
        <p class="empty-hint">Tap the + button on the map to drop your first one.</p>
      </div>
    );
  }

  return (
    <ul class="note-list">
      {ordered.map((note) => (
        <li key={note.id}>
          <button class="note-row" onClick={() => onOpen(note.id)}>
            <span class="note-row-icon">{note.imageIds.length ? '🖼️' : '📝'}</span>
            <span class="note-row-body">
              <span class="note-row-text">{preview(note.text)}</span>
              <span class="note-row-meta">
                {location && <>{formatDistance(haversine(location, note))} · </>}
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
