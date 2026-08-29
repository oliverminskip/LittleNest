import { useMemo } from 'react';
import { RatioTimeline } from '@/components/dashboard/RatioTimeline';
import { Spinner } from '@/components/ui/Primitives';
import { useAuth } from '@/hooks/useAuth';
import { useChildren } from '@/hooks/useChildren';
import { updateChild } from '@/services/firebase/data';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_RATIO_LIMITS } from '@/lib/constants';
import type { Weekday } from '@/types';

export function TimelineScreen() {
  const { profile, setting, user } = useAuth();
  const toast = useToast();
  const settingId = profile?.settingId ?? '';
  const { data: children, loading } = useChildren(settingId, 'minder', user?.uid);

  const limits = useMemo(
    () => ({ ...DEFAULT_RATIO_LIMITS, ...(setting?.ratioLimits ?? {}) }),
    [setting?.ratioLimits],
  );

  const saveSession = async (childId: string, weekday: Weekday, start: string, end: string) => {
    const child = children.find((candidate) => candidate.id === childId);
    if (!child) return;
    try {
      await updateChild(settingId, childId, {
        schedule: { ...(child.schedule ?? {}), [weekday]: { start, end } },
      });
      toast.success('Hours updated', `${child.name.split(' ')[0]} ${start}–${end}`);
    } catch (err) {
      toast.error("Couldn't save those hours", (err as Error).message);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-[30px]">Ratios &amp; capacity</h1>
      <p className="mb-5 text-[13.5px] font-semibold leading-relaxed text-ink-sub">
        Drag a session to try it out against your statutory ratios before you commit to a new
        enquiry. Nothing is saved until you tap Save.
      </p>

      {loading ? (
        <Spinner />
      ) : (
        <RatioTimeline children={children} limits={limits} onSaveSession={saveSession} />
      )}
    </div>
  );
}
