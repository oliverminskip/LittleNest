import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from './config';
import { compressPhoto, type CompressedPhoto } from '@/lib/image';

export interface UploadResult {
  url: string;
  path: string;
  compressed: CompressedPhoto;
}

export interface UploadHandlers {
  /** 0–100, covering compression (first 30%) then transfer (remaining 70%). */
  onProgress?: (percent: number) => void;
}

/**
 * Compress-then-upload pipeline for diary and observation photos.
 *
 * Storage paths mirror the Firestore tenancy (`settings/{settingId}/children/{childId}/…`)
 * so the same per-tenant rules in `storage.rules` apply without a lookup.
 */
export async function uploadChildPhoto(
  settingId: string,
  childId: string,
  file: File,
  handlers: UploadHandlers = {},
): Promise<UploadResult> {
  const { onProgress } = handlers;

  const compressed = await compressPhoto(file, (percent) => onProgress?.(percent * 0.3));

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const path = `settings/${settingId}/children/${childId}/photos/${filename}`;
  const objectRef = ref(storage, path);

  const task = uploadBytesResumable(objectRef, compressed.file, {
    contentType: 'image/jpeg',
    cacheControl: 'public,max-age=31536000,immutable',
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const transferred = snapshot.bytesTransferred / snapshot.totalBytes;
        onProgress?.(30 + transferred * 70);
      },
      reject,
      () => resolve(),
    );
  });

  return { url: await getDownloadURL(objectRef), path, compressed };
}

/** Removes the stored object. Safe to call for a photo that is already gone. */
export async function deleteChildPhoto(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* Already deleted, or never uploaded — nothing to clean up. */
  }
}
