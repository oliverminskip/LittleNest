import { useState } from 'react';
import { Avatar, Badge, Pill } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { OvertimeQuickPunch } from './OvertimeSheet';
import { useLongPress } from '@/hooks/useLongPress';
import { formatAge, formatTime } from '@/lib/dates';
import { cn } from '@/lib/format';
import { signInChild, signOutChild, undoSignOut } from '@/services/firebase/data';
import { useToast } from '@/hooks/useToast';
import type { Attendance, BillingDefaults, Child } from '@/types';

interface ChildDashCardProps {
  child: Child;
  attendance?: Attendance;
  unread: number;
  settingId: string;
  billing: BillingDefaults;
  selectionActive: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onStartSelection: () => void;
  onOvertimeMore: () => void;
  onShareCode: () => void;
  onQuickLog: () => void;
}

export function ChildDashCard({
  child,
  attendance,
  unread,
  settingId,
  billing,
  selectionActive,
  selected,
  onOpen,
  onToggleSelect,
  onStartSelection,
  onOvertimeMore,
  onShareCode,
  onQuickLog,
}: ChildDashCardProps) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { handlers, didLongPress } = useLongPress(onStartSelection);

  const age = formatAge(child.dob);
  const linked = (child.parentUids ?? []).length > 0;
  const isIn = Boolean(attendance?.signInAt && !attendance?.signOutAt);
  const isOut = Boolean(attendance?.signOutAt);

  const handleTap = () => {
    // Swallow the click the long-press already handled, so entering selection
    // mode doesn't also navigate into the child.
    if (didLongPress()) return;
    if (selectionActive) onToggleSelect();
    else onOpen();
  };

  const attendanceAction = async (action: 'in' | 'out' | 'undo') => {
    setBusy(true);
    try {
      if (action === 'in') {
        await signInChild(settingId, child.id);
        toast.success('✓ Signed in', `${child.name} marked as in`);
      } else if (action === 'out') {
        await signOutChild(settingId, child.id);
        toast.success('✓ Signed out', `${child.name} marked as out`);
      } else {
        await undoSignOut(settingId, child.id);
      }
    } catch (err) {
      toast.error("Couldn't update the register", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        'ln-card mb-3 animate-rise p-3.5 transition',
        selected && 'border-brand-500 ring-2 ring-brand-500/25',
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleTap}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') handleTap();
        }}
        className="flex items-center gap-3 text-left"
        {...handlers}
      >
        {selectionActive ? (
          <span
            aria-hidden
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 text-[13px] font-black transition',
              selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white',
            )}
          >
            {selected ? '✓' : ''}
          </span>
        ) : null}

        <Avatar name={child.name} colour={child.colour} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[17px] font-black">{child.name}</span>
            {age ? <span className="shrink-0 text-[12.5px] font-bold text-ink-sub">{age}</span> : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {isIn ? (
              <Pill tone="in">● In since {formatTime(attendance?.signInAt)}</Pill>
            ) : isOut ? (
              <Pill>Out {formatTime(attendance?.signOutAt)}</Pill>
            ) : (
              <Pill>Not in yet</Pill>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge count={unread} />
          {!selectionActive ? <span className="text-[22px] leading-none text-ink-faint">›</span> : null}
        </div>
      </div>

      {selectionActive ? null : (
        <>
          {/* The register is the minder's Ofsted record, so signing in and
              logging never wait on a parent redeeming their invite code. */}
          <div className="mt-3 flex gap-2 border-t border-line-soft pt-3">
            {isIn ? (
              <Button variant="ghost" size="sm" className="flex-1" loading={busy} onClick={() => void attendanceAction('out')}>
                Sign out
              </Button>
            ) : isOut ? (
              <Button variant="ghost" size="sm" className="flex-1" loading={busy} onClick={() => void attendanceAction('undo')}>
                Undo sign-out
              </Button>
            ) : (
              <Button variant="green" size="sm" className="flex-1" loading={busy} onClick={() => void attendanceAction('in')}>
                Sign in
              </Button>
            )}
            <Button variant="soft" size="sm" className="flex-1" onClick={onQuickLog}>
              ＋ Update
            </Button>
          </div>

          {isIn ? (
            <div className="mt-3 border-t border-line-soft pt-3">
              <OvertimeQuickPunch
                settingId={settingId}
                child={child}
                billing={billing}
                onMore={onOvertimeMore}
              />
            </div>
          ) : null}

          {/* Until a parent redeems the code, keep it in reach — it is the one
              outstanding setup step for this child. */}
          {linked ? null : (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line-soft pt-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-sub">
                  Parent code
                </p>
                <p className="font-mono text-[16px] font-extrabold tracking-wide text-gold">
                  {child.setupCode}
                </p>
              </div>
              <Button variant="soft" size="sm" onClick={onShareCode}>
                Share code
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
