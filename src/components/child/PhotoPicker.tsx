import { useEffect, useRef, useState } from 'react';
import { compressPhoto, formatBytes, PhotoError, type CompressedPhoto } from '@/lib/image';
import { cn } from '@/lib/format';

/**
 * Camera / library picker that compresses before anything is uploaded.
 *
 * The compression happens the moment a file is chosen — not at submit — so the
 * minder sees the "4.2 MB → 180 KB" confirmation while they are still writing
 * the caption, and the actual upload is near-instant even on a park 3G signal.
 */
export function PhotoPicker({
  value,
  onChange,
  progress,
}: {
  value: CompressedPhoto | null;
  onChange: (photo: CompressedPhoto | null) => void;
  progress?: number | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Object URLs leak until revoked, and a minder may swap photos several times
  // before posting.
  useEffect(() => () => {
    if (value) URL.revokeObjectURL(value.previewUrl);
  }, [value]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setWorking(true);
    try {
      onChange(await compressPhoto(file));
    } catch (err) {
      setError(err instanceof PhotoError ? err.message : 'That photo could not be prepared.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mb-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void pick(event.target.files?.[0])}
      />

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <img src={value.previewUrl} alt="Selected" className="max-h-64 w-full object-cover" />
          <div className="flex items-center gap-3 px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-extrabold text-moss">
                {formatBytes(value.originalBytes)} → {formatBytes(value.compressedBytes)}
                {value.ratio > 1 ? ` · ${value.ratio}× smaller` : ''}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-sub">
                Resized to 1200px on your device before upload.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="shrink-0 text-[12.5px] font-extrabold text-rose"
            >
              Remove
            </button>
          </div>

          {typeof progress === 'number' ? (
            <div className="h-1.5 w-full bg-line">
              <div
                className="h-full bg-brand-500 transition-[width]"
                style={{ width: `${Math.min(100, Math.round(progress))}%` }}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={working}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-line',
            'bg-white py-6 text-[14.5px] font-extrabold text-ink-sub transition active:scale-[.99] disabled:opacity-60',
          )}
        >
          {working ? 'Preparing photo…' : '📷 Add a photo'}
        </button>
      )}

      {error ? <p className="mt-2 text-[12.5px] font-bold text-rose">{error}</p> : null}
    </div>
  );
}
