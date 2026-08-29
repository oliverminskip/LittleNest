import { useCallback, useMemo, useRef, useState } from 'react';
import {
  BAND_LABELS,
  blocksForDay,
  findBreaches,
  occupancyAt,
  upcomingOpenings,
  type TimelineBlock,
} from '@/lib/ratios';
import { TIMELINE_END_HOUR, TIMELINE_START_HOUR, WEEKDAY_LABELS } from '@/lib/constants';
import { formatAge, minutesToTime, snapToQuarter } from '@/lib/dates';
import { cn } from '@/lib/format';
import { EmptyState } from '@/components/ui/Primitives';
import type { Child, RatioLimits, Weekday } from '@/types';

const DAY_START = TIMELINE_START_HOUR * 60;
const DAY_END = TIMELINE_END_HOUR * 60;
const DAY_SPAN = DAY_END - DAY_START;
const ROW_HEIGHT = 56;

type DragMode = 'move' | 'start' | 'end';

interface DragState {
  childId: string;
  mode: DragMode;
  pointerId: number;
  originX: number;
  originStart: number;
  originEnd: number;
}

/**
 * Visual ratio & capacity timeline.
 *
 * Sessions are dragged along the time axis (and resized from either edge) to
 * try out a new enquiry against the statutory ratios *before* saying yes to a
 * parent. Every breach is recalculated on each pointer move, so the grid goes
 * amber the instant a proposed session would put a fourth under-five on the
 * books.
 *
 * Drags are local-only until saved — nothing here writes to Firestore, so a
 * minder can model "what if" freely without touching real contracts.
 */
export function RatioTimeline({
  children: childList,
  limits,
  onSaveSession,
}: {
  children: Child[];
  limits: RatioLimits;
  onSaveSession?: (childId: string, weekday: Weekday, start: string, end: string) => void;
}) {
  const today = new Date().getDay() as Weekday;
  const [weekday, setWeekday] = useState<Weekday>(today === 0 || today === 6 ? 1 : today);
  const [overrides, setOverrides] = useState<Record<string, { start: number; end: number }>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const viewDate = useMemo(() => new Date(), []);
  const blocks = useMemo(
    () => blocksForDay(childList, weekday, viewDate, overrides),
    [childList, weekday, viewDate, overrides],
  );
  const breaches = useMemo(() => findBreaches(blocks, limits), [blocks, limits]);
  const openings = useMemo(() => upcomingOpenings(childList, limits), [childList, limits]);

  const dirty = Object.keys(overrides).length > 0;

  /** Converts a horizontal pixel delta into a quarter-hour delta. */
  const deltaMinutes = useCallback((deltaX: number) => {
    const width = gridRef.current?.clientWidth ?? 1;
    return snapToQuarter((deltaX / width) * DAY_SPAN);
  }, []);

  const onPointerDown = (event: React.PointerEvent, block: TimelineBlock, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    setDrag({
      childId: block.childId,
      mode,
      pointerId: event.pointerId,
      originX: event.clientX,
      originStart: block.start,
      originEnd: block.end,
    });
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const shift = deltaMinutes(event.clientX - drag.originX);

    let start = drag.originStart;
    let end = drag.originEnd;
    if (drag.mode === 'move') {
      const span = end - start;
      start = Math.min(Math.max(DAY_START, start + shift), DAY_END - span);
      end = start + span;
    } else if (drag.mode === 'start') {
      // Keep at least a 30-minute session so a block can't be dragged inside out.
      start = Math.min(Math.max(DAY_START, start + shift), end - 30);
    } else {
      end = Math.max(Math.min(DAY_END, end + shift), start + 30);
    }

    setOverrides((previous) => ({ ...previous, [drag.childId]: { start, end } }));
  };

  const endDrag = () => setDrag(null);

  const save = () => {
    if (!onSaveSession) return;
    Object.entries(overrides).forEach(([childId, session]) => {
      onSaveSession(childId, weekday, minutesToTime(session.start), minutesToTime(session.end));
    });
    setOverrides({});
  };

  const scheduled = childList.filter((child) => child.schedule?.[weekday]);
  const hours = Array.from(
    { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
    (_, index) => TIMELINE_START_HOUR + index,
  );

  return (
    <div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto ln-no-scrollbar">
        {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => {
              setWeekday(day);
              setOverrides({});
            }}
            className={cn(
              'shrink-0 rounded-xl border-[1.5px] px-4 py-2 text-[13px] font-extrabold transition',
              weekday === day ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-sub',
            )}
          >
            {WEEKDAY_LABELS[day]}
          </button>
        ))}
      </div>

      <CapacityMeter blocks={blocks} limits={limits} />

      {scheduled.length === 0 ? (
        <EmptyState
          emoji="🗓️"
          title="No sessions on this day"
          body="Add contracted hours on a child's profile and they'll appear here, checked against your Ofsted ratios."
        />
      ) : (
        <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          <div className="flex border-b border-line-soft bg-brand-50/60 px-3 py-2">
            <div className="w-[86px] shrink-0" />
            <div className="relative flex-1">
              {hours.map((hour) => (
                <span
                  key={hour}
                  className="absolute -translate-x-1/2 text-[10.5px] font-extrabold text-ink-sub"
                  style={{ left: `${((hour * 60 - DAY_START) / DAY_SPAN) * 100}%` }}
                >
                  {hour}
                </span>
              ))}
              <div className="h-4" />
            </div>
          </div>

          <div
            ref={gridRef}
            className="relative touch-none"
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* Breach shading sits behind the rows so it reads as a column of risk. */}
            {breaches.map((breach, index) => (
              <div
                key={`${breach.band}-${index}`}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 z-0 bg-rose/10"
                style={{
                  left: `calc(86px + ${((breach.from - DAY_START) / DAY_SPAN) * 100}% - ${((breach.from - DAY_START) / DAY_SPAN) * 86}px)`,
                  width: `${((breach.to - breach.from) / DAY_SPAN) * 100}%`,
                }}
              />
            ))}

            {blocks.map((block) => {
              const child = childList.find((candidate) => candidate.id === block.childId);
              const left = ((block.start - DAY_START) / DAY_SPAN) * 100;
              const width = ((block.end - block.start) / DAY_SPAN) * 100;
              const dragging = drag?.childId === block.childId;

              return (
                <div
                  key={block.childId}
                  className="flex items-center border-b border-line-soft px-3 last:border-0"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div className="w-[86px] shrink-0 pr-2">
                    <p className="truncate text-[13px] font-black">{block.childName.split(' ')[0]}</p>
                    <p className="text-[10.5px] font-bold text-ink-sub">{formatAge(child?.dob)}</p>
                  </div>

                  <div className="relative h-full flex-1">
                    <div
                      role="slider"
                      tabIndex={0}
                      aria-label={`${block.childName} session`}
                      aria-valuetext={`${minutesToTime(block.start)} to ${minutesToTime(block.end)}`}
                      aria-valuenow={block.start}
                      aria-valuemin={DAY_START}
                      aria-valuemax={DAY_END}
                      onPointerDown={(event) => onPointerDown(event, block, 'move')}
                      onKeyDown={(event) => {
                        const step = event.shiftKey ? 60 : 15;
                        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                          event.preventDefault();
                          const shift = event.key === 'ArrowLeft' ? -step : step;
                          const span = block.end - block.start;
                          const start = Math.min(Math.max(DAY_START, block.start + shift), DAY_END - span);
                          setOverrides((previous) => ({
                            ...previous,
                            [block.childId]: { start, end: start + span },
                          }));
                        }
                      }}
                      className={cn(
                        'absolute top-1/2 flex h-9 -translate-y-1/2 cursor-grab items-center justify-center',
                        'rounded-xl px-2 text-[11.5px] font-black text-white shadow-sm transition-shadow',
                        dragging && 'cursor-grabbing shadow-lg ring-2 ring-white',
                      )}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: block.colour || '#6C5CE7',
                        touchAction: 'none',
                      }}
                    >
                      <span
                        onPointerDown={(event) => onPointerDown(event, block, 'start')}
                        className="absolute left-0 h-full w-3 cursor-ew-resize rounded-l-xl bg-black/15"
                        aria-hidden
                      />
                      <span className="pointer-events-none truncate">
                        {minutesToTime(block.start)}–{minutesToTime(block.end)}
                      </span>
                      <span
                        onPointerDown={(event) => onPointerDown(event, block, 'end')}
                        className="absolute right-0 h-full w-3 cursor-ew-resize rounded-r-xl bg-black/15"
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dirty && onSaveSession ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setOverrides({})}
            className="flex-1 rounded-2xl border-[1.5px] border-line bg-white py-3 text-[14px] font-extrabold"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-2xl bg-brand-600 py-3 text-[14px] font-extrabold text-white"
          >
            Save these hours
          </button>
        </div>
      ) : null}

      <BreachList breaches={breaches} />
      <OpeningsList openings={openings} />
    </div>
  );
}

function CapacityMeter({ blocks, limits }: { blocks: TimelineBlock[]; limits: RatioLimits }) {
  // Peak occupancy is what matters for compliance, not the current minute —
  // a breach at 15:30 is still a breach when you check at 09:00.
  const peak = useMemo(() => {
    const bands = { underOne: 0, underFive: 0, underEight: 0 };
    for (let minute = DAY_START; minute <= DAY_END; minute += 15) {
      const at = occupancyAt(blocks, minute);
      bands.underOne = Math.max(bands.underOne, at.underOne);
      bands.underFive = Math.max(bands.underFive, at.underFive);
      bands.underEight = Math.max(bands.underEight, at.underEight);
    }
    return bands;
  }, [blocks]);

  return (
    <div className="flex gap-2.5">
      {(Object.keys(limits) as (keyof RatioLimits)[]).map((band) => {
        const used = peak[band];
        const limit = limits[band];
        const over = used > limit;
        const full = used === limit;

        return (
          <div
            key={band}
            className={cn(
              'flex-1 rounded-2xl border p-3',
              over ? 'border-rose/30 bg-rose-bg' : full ? 'border-gold/30 bg-gold-bg' : 'border-line bg-white',
            )}
          >
            <p className="text-[11px] font-black uppercase tracking-wide text-ink-sub">
              {BAND_LABELS[band]}
            </p>
            <p
              className={cn(
                'mt-1 font-display text-[24px] font-semibold leading-none',
                over ? 'text-rose' : full ? 'text-gold' : 'text-moss',
              )}
            >
              {used}
              <span className="text-[15px] text-ink-faint">/{limit}</span>
            </p>
            <p className="mt-1 text-[11px] font-bold text-ink-sub">
              {over ? 'Over ratio' : full ? 'At capacity' : `${limit - used} space${limit - used === 1 ? '' : 's'}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function BreachList({ breaches }: { breaches: ReturnType<typeof findBreaches> }) {
  if (!breaches.length) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-moss/15 bg-moss-bg px-4 py-3.5">
        <span className="text-[20px]">✅</span>
        <p className="text-[13.5px] font-extrabold leading-snug text-moss">
          Within Ofsted ratios all day.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-rose/25 bg-rose-bg p-4">
      <p className="mb-2 text-[13px] font-black text-rose">⚠️ Over ratio</p>
      <ul className="space-y-1.5">
        {breaches.map((breach, index) => (
          <li key={index} className="text-[13px] font-bold leading-snug text-ink-soft">
            {minutesToTime(breach.from)}–{minutesToTime(breach.to)}: {breach.count}{' '}
            {BAND_LABELS[breach.band].toLowerCase()}s, limit {breach.limit}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-sub">
        Continuity-of-care and sibling exceptions can apply — adjust your limits in Settings if
        Ofsted has agreed a variation for your setting.
      </p>
    </div>
  );
}

function OpeningsList({ openings }: { openings: ReturnType<typeof upcomingOpenings> }) {
  if (!openings.length) return null;

  return (
    <div className="mt-3 rounded-2xl border border-line bg-white p-4">
      <p className="mb-2.5 text-[13px] font-black">📅 When a space opens up</p>
      <ul className="space-y-2">
        {openings.map((opening) => (
          <li key={`${opening.band}-${opening.childName}`} className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-bold text-ink-soft">
              {BAND_LABELS[opening.band]} space — {opening.reason}
            </span>
            <span className="shrink-0 text-[13px] font-black text-brand-600">
              {opening.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-sub">
        Quote these dates to waiting-list parents — they are the exact days your ratio frees up.
      </p>
    </div>
  );
}
