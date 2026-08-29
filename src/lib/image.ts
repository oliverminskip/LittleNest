import imageCompression from 'browser-image-compression';

/**
 * Client-side photo compression.
 *
 * A modern phone camera produces 4–8 MB, 4000px images. Uploading those from a
 * park on 3G costs the minder minutes and the setting real money in Storage
 * bandwidth, and no parent ever needs more than a 1200px long edge on a phone
 * screen. Everything is downscaled in a worker on the device before a byte
 * leaves it — which is also what makes the "zero-cloud photo privacy" promise
 * meaningful: the original never goes anywhere.
 */

export const PHOTO_CONSTRAINTS = {
  maxWidthOrHeight: 1200,
  /** JPEG quality — 0.75 is the point where artefacts stop being visible at phone sizes. */
  quality: 0.75,
  maxSizeMB: 0.6,
} as const;

export interface CompressedPhoto {
  file: File;
  /** Object URL for immediate preview. Revoke it when the preview unmounts. */
  previewUrl: string;
  originalBytes: number;
  compressedBytes: number;
  /** e.g. 12.4 — how many times smaller the upload is. */
  ratio: number;
}

export class PhotoError extends Error {}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function compressPhoto(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CompressedPhoto> {
  if (!file.type.startsWith('image/') && !ACCEPTED.includes(file.type)) {
    throw new PhotoError('That file is not an image we can use — try a photo from your camera roll.');
  }

  const compressed = await imageCompression(file, {
    maxWidthOrHeight: PHOTO_CONSTRAINTS.maxWidthOrHeight,
    maxSizeMB: PHOTO_CONSTRAINTS.maxSizeMB,
    initialQuality: PHOTO_CONSTRAINTS.quality,
    // Keeps the main thread free so the sheet stays responsive mid-compress.
    useWebWorker: true,
    fileType: 'image/jpeg',
    onProgress,
  });

  // `browser-image-compression` returns a Blob-like File; re-wrap it so the
  // name and extension match the JPEG we actually produced.
  const renamed = new File([compressed], toJpegName(file.name), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  return {
    file: renamed,
    previewUrl: URL.createObjectURL(renamed),
    originalBytes: file.size,
    compressedBytes: renamed.size,
    ratio: file.size > 0 ? Math.round((file.size / renamed.size) * 10) / 10 : 1,
  };
}

function toJpegName(original: string): string {
  const base = original.replace(/\.[^.]+$/, '') || 'photo';
  return `${base.slice(0, 40)}.jpg`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
