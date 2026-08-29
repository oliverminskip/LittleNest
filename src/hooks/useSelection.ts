import { useCallback, useMemo, useState } from 'react';

/**
 * Multi-select state for one-handed batch logging.
 *
 * Selection mode is entered by long-pressing a card (or tapping "Select"), and
 * exits automatically when the last child is deselected — so a minder never
 * ends up stuck in a mode they didn't mean to enter while holding a baby.
 */
export function useSelection<T extends string = string>() {
  const [selected, setSelected] = useState<Set<T>>(() => new Set());
  const [active, setActive] = useState(false);

  const toggle = useCallback((id: T) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setActive(false);
      return next;
    });
  }, []);

  const start = useCallback((id?: T) => {
    setActive(true);
    if (id) setSelected(new Set([id]));
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
    setActive(false);
  }, []);

  const selectAll = useCallback((ids: T[]) => {
    setActive(true);
    setSelected(new Set(ids));
  }, []);

  return useMemo(
    () => ({
      selected,
      ids: [...selected],
      count: selected.size,
      active,
      isSelected: (id: T) => selected.has(id),
      toggle,
      start,
      clear,
      selectAll,
    }),
    [selected, active, toggle, start, clear, selectAll],
  );
}
