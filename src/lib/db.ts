import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Note } from './types';

// IndexedDB (not localStorage) because note photos are blobs and would blow past
// localStorage's ~5MB cap almost immediately.

interface SpotDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-updated': number };
  };
  images: {
    key: string;
    value: Blob;
  };
}

const DB_NAME = 'spot-codemonkey';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SpotDB>> | null = null;

function db(): Promise<IDBPDatabase<SpotDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SpotDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const store = database.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('by-updated', 'updatedAt');
        database.createObjectStore('images');
      }
    });
  }
  return dbPromise;
}

/** Insert or replace a note, optionally storing new image blobs keyed by image id. */
export async function putNote(note: Note, images?: Map<string, Blob>): Promise<void> {
  const database = await db();
  const tx = database.transaction(['notes', 'images'], 'readwrite');
  await tx.objectStore('notes').put(note);
  if (images) {
    const store = tx.objectStore('images');
    for (const [id, blob] of images) {
      await store.put(blob, id);
    }
  }
  await tx.done;
}

export async function getAllNotes(): Promise<Note[]> {
  const database = await db();
  // Newest edit first; the list view re-sorts by distance when it can.
  const all = await database.getAllFromIndex('notes', 'by-updated');
  return all.reverse();
}

export async function getNote(id: string): Promise<Note | undefined> {
  const database = await db();
  return database.get('notes', id);
}

export async function deleteNote(id: string): Promise<void> {
  const note = await getNote(id);
  const database = await db();
  const tx = database.transaction(['notes', 'images'], 'readwrite');
  await tx.objectStore('notes').delete(id);
  if (note) {
    const store = tx.objectStore('images');
    for (const imageId of note.imageIds) {
      await store.delete(imageId);
    }
  }
  await tx.done;
}

export async function getImage(id: string): Promise<Blob | undefined> {
  const database = await db();
  return database.get('images', id);
}

/** Remove an orphaned image blob (e.g. after a note's photo is replaced). */
export async function deleteImage(id: string): Promise<void> {
  const database = await db();
  await database.delete('images', id);
}

export async function clearAll(): Promise<void> {
  const database = await db();
  const tx = database.transaction(['notes', 'images'], 'readwrite');
  await tx.objectStore('notes').clear();
  await tx.objectStore('images').clear();
  await tx.done;
}
