import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Sticky footer for the primary action, kept above the home indicator. */
  footer?: ReactNode;
}

/**
 * Bottom sheet — the app's one modal pattern.
 *
 * Everything a minder does mid-shift happens here rather than on a pushed
 * route, so a mis-tap is a swipe away and never loses the dashboard behind it.
 */
export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    // Stop the page behind the sheet from scrolling with it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex animate-fadein items-end justify-center bg-ink/50 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-app animate-slideup flex-col rounded-t-4xl bg-cream-raised shadow-sheet"
      >
        <div className="shrink-0 px-5 pt-3.5">
          <div className="mx-auto mb-3.5 h-[5px] w-10 rounded-full bg-line" />
          <h3 className="mb-4 text-[24px]">{title}</h3>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-line bg-cream-raised px-5 pt-3 pb-safe">{footer}</div>
        ) : (
          <div className="pb-safe" />
        )}
      </div>
    </div>,
    document.body,
  );
}
