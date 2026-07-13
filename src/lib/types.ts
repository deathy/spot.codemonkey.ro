// Core data model. The shape of a stored note is also the basis of the export
// shape, so keep this stable and version any breaking changes via EXPORT_VERSION.

export interface GpsFix {
  lat: number;
  lng: number;
  /** Accuracy radius in metres, as reported by the Geolocation API. */
  accuracy: number;
}

export interface Note {
  /** Stable unique id. */
  id: string;
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lng: number;
  /** GPS accuracy (m) at capture, when the note was placed from a live fix. */
  accuracy?: number;
  /** Free-text body. Optional — a note may be photo-only. */
  text?: string;
  /** Ids of image blobs in the images store. MVP stores 0 or 1. */
  imageIds: string[];
  /** Post-it colour / category. Reserved for later; unused in MVP. */
  color?: string;
  /** Epoch milliseconds when the note was created. */
  createdAt: number;
  /** Epoch milliseconds of the last edit. */
  updatedAt: number;
}

/** A map camera position — centre plus zoom. Used transiently, never persisted. */
export interface MapCamera {
  lat: number;
  lng: number;
  zoom: number;
}

export const EXPORT_VERSION = 1;
