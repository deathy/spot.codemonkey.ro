// Camera captures can be many megabytes. Before storing, downscale to a sane max
// edge and re-encode as JPEG so IndexedDB (and JSON export) stays manageable.

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    // Honours EXIF orientation in modern browsers.
    return createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode image'));
    };
    img.src = url;
  });
}

/**
 * Downscale + JPEG-compress a captured image. Returns the original blob untouched
 * if anything goes wrong (better to store a big photo than to lose the note).
 */
export async function processImage(file: Blob): Promise<Blob> {
  try {
    const bitmap = await loadBitmap(file);
    const w = 'width' in bitmap ? bitmap.width : (bitmap as HTMLImageElement).naturalWidth;
    const h = 'height' in bitmap ? bitmap.height : (bitmap as HTMLImageElement).naturalHeight;
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, outW, outH);
    if ('close' in bitmap) (bitmap as ImageBitmap).close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Object URL for a stored blob. Caller is responsible for revoking it. */
export function objectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
