import { useEffect, useState } from 'preact/hooks';
import type { GpsFix, Note } from '../lib/types';
import { getImage } from '../lib/db';
import { formatDistance, haversine } from '../lib/geo';

interface Props {
  note: Note;
  location: GpsFix | null;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NoteDetail({ note, location, onEdit, onDelete, onClose }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    const imageId = note.imageIds[0];
    if (imageId) {
      getImage(imageId).then((blob) => {
        if (blob && !cancelled) {
          url = URL.createObjectURL(blob);
          setImageUrl(url);
        }
      });
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [note.id]);

  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet" onClick={(e) => e.stopPropagation()}>
        <div class="sheet-handle" />

        {imageUrl && (
          <div class="detail-photo">
            <img src={imageUrl} alt="Note photo" />
          </div>
        )}

        {note.text ? (
          <p class="detail-text">{note.text}</p>
        ) : (
          <p class="detail-text dim">(no text)</p>
        )}

        <p class="coords">
          📍 {note.lat.toFixed(5)}, {note.lng.toFixed(5)}
          {location && <> · {formatDistance(haversine(location, note))} away</>}
          <a
            class="osm-link"
            href={`https://www.openstreetmap.org/?mlat=${note.lat}&mlon=${note.lng}#map=18/${note.lat}/${note.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in OSM
          </a>
        </p>
        <p class="detail-date">Added {new Date(note.createdAt).toLocaleString()}</p>

        <div class="sheet-buttons">
          {confirmDelete ? (
            <>
              <button onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button class="danger" onClick={onDelete}>
                Delete for good
              </button>
            </>
          ) : (
            <>
              <button class="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
              <button onClick={onClose}>Close</button>
              <button class="primary" onClick={onEdit}>
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
