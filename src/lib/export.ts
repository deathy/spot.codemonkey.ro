import { EXPORT_VERSION, type Note } from './types';
import { getAllNotes, getImage, putNote } from './db';

// JSON export/import. Self-contained: image blobs are inlined as data URLs so the
// export file stands alone with no external references, and import restores them.

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

interface ExportNote extends Note {
  /** ISO-8601 form of `createdAt`, for human readability. */
  createdAtISO: string;
  /** Inlined image data URLs, parallel to `imageIds`. */
  images: string[];
}

interface ExportFile {
  app: string;
  version: number;
  exportedAt: string;
  count: number;
  notes: ExportNote[];
}

export async function buildExport(): Promise<string> {
  const notes = await getAllNotes();
  const out: ExportNote[] = [];
  for (const n of notes) {
    const images: string[] = [];
    for (const imageId of n.imageIds) {
      const blob = await getImage(imageId);
      if (blob) images.push(await blobToDataUrl(blob));
    }
    out.push({ ...n, createdAtISO: new Date(n.createdAt).toISOString(), images });
  }
  return JSON.stringify(
    {
      app: 'spot.codemonkey.ro',
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      count: out.length,
      notes: out
    } satisfies ExportFile,
    null,
    2
  );
}

export async function downloadExport(): Promise<void> {
  const json = await buildExport();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `spot-notes-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

/**
 * Import notes from an export file's JSON text. Additive: existing notes with the
 * same id are overwritten, everything else is added. Malformed entries are skipped.
 */
export async function importFromJson(text: string): Promise<ImportResult> {
  const parsed = JSON.parse(text) as Partial<ExportFile>;
  const notes = Array.isArray(parsed.notes) ? parsed.notes : [];
  let imported = 0;
  let skipped = 0;

  for (const raw of notes) {
    if (
      !raw ||
      typeof raw.id !== 'string' ||
      typeof raw.lat !== 'number' ||
      typeof raw.lng !== 'number'
    ) {
      skipped++;
      continue;
    }
    const images = new Map<string, Blob>();
    const imageIds: string[] = [];
    const dataUrls = Array.isArray(raw.images) ? raw.images : [];
    for (let i = 0; i < dataUrls.length; i++) {
      try {
        const blob = await dataUrlToBlob(dataUrls[i]);
        const imageId = raw.imageIds?.[i] ?? `${raw.id}-img-${i}`;
        images.set(imageId, blob);
        imageIds.push(imageId);
      } catch {
        /* skip an undecodable image but keep the note */
      }
    }
    const now = Date.now();
    const note: Note = {
      id: raw.id,
      lat: raw.lat,
      lng: raw.lng,
      accuracy: typeof raw.accuracy === 'number' ? raw.accuracy : undefined,
      text: typeof raw.text === 'string' ? raw.text : undefined,
      imageIds,
      color: typeof raw.color === 'string' ? raw.color : undefined,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now
    };
    await putNote(note, images);
    imported++;
  }
  return { imported, skipped };
}
