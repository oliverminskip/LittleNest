import { useCallback, useRef } from 'react';

/**
 * Long-press without hijacking scrolling.
 *
 * A childminder scrolls the dashboard one-handed with a thumb, so the timer is
 * cancelled the moment the pointer moves more than a few pixels — otherwise
 * every flick of the list would drop them into selection mode.
 */
export function useLongPress(onLongPress: () => void, delay = 450) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      fired.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        // Confirms the mode change on devices that support it.
        navigator.vibrate?.(12);
        onLongPress();
      }, delay);
    },
    [onLongPress, delay],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!origin.current) return;
      const moved =
        Math.abs(event.clientX - origin.current.x) + Math.abs(event.clientY - origin.current.y);
      if (moved > 10) cancel();
    },
    [cancel],
  );

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    },
    /** True if the last gesture was a long press — use it to swallow the click. */
    didLongPress: () => fired.current,
  };
}
