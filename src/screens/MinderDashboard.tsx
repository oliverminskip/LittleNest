import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChildDashCard } from '@/components/dashboard/ChildDashCard';
import { BatchLogSheet } from '@/components/dashboard/BatchLogSheet';
import { OvertimeSheet } from '@/components/dashboard/OvertimeSheet';
import { AddChildSheet } from './AddChildSheet';
import { DiaryComposer } from '@/components/child/Composers';
import { Button } from '@/components/ui/Button';
import { EmptyState, StatTile } from '@/components/ui/Primitives';
import { SectionTitle } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useChildren } from '@/hooks/useChildren';
import { useAttendanceForDay, useUnreadCounts } from '@/hooks/useChildData';
import { useSelection } from '@/hooks/useSelection';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_BILLING } from '@/lib/constants';
import { firstName, greeting, pluralise } from '@/lib/format';
import type { Child } from '@/types';

export function MinderDashboard() {
  const { profile, setting, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const settingId = profile?.settingId ?? '';

  const { data: children, loading } = useChildren(settingId, 'minder', user?.uid);
  const childIds = useMemo(() => children.map((child) => child.id), [children]);
  const attendance = useAttendanceForDay(settingId, childIds);
  const unread = useUnreadCounts(settingId, childIds, 'minder');

  const selection = useSelection();
  const [batchOpen, setBatchOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [overtimeChild, setOvertimeChild] = useState<Child | null>(null);
  const [quickLogChild, setQuickLogChild] = useState<Child | null>(null);

  const billing = { ...DEFAULT_BILLING, ...(setting?.billing ?? {}) };

  const inToday = children.filter(
    (child) => attendance[child.id]?.signInAt && !attendance[child.id]?.signOutAt,
  ).length;
  const totalUnread = Object.values(unread).reduce((sum, count) => sum + count, 0);

  const selectedChildren = children.filter((child) => selection.isSelected(child.id));

  const shareCode = async (child: Child) => {
    const link = window.location.origin;
    const message = `Hi! I use LittleNest 🪺 to share ${child.name}'s daily updates and learning journey.\n\nTo connect:\n1. Open ${link}\n2. Tap "I'm a parent with an invite code"\n3. Enter your code: ${child.setupCode}\n\nThat's it — you'll see everything in one place.`;

    if (navigator.share) {
      await navigator.share({ title: 'LittleNest invite', text: message }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(message);
      toast.success('✓ Copied', 'Invite message copied to your clipboard');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="ln-eyebrow mb-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-[30px]">
            {greeting()}
            {firstName(profile?.name) ? `, ${firstName(profile?.name)}` : ''}
          </h1>
        </div>
      </div>

      <div className="mb-4 flex gap-2.5">
        <StatTile value={inToday} label="In today" tone="#1A8551" />
        <StatTile value={children.length} label="On roll" tone="#6C5CE7" />
        <StatTile value={totalUnread} label="Unread" tone={totalUnread > 0 ? '#C0455B' : undefined} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <SectionTitle className="mb-0">Your children</SectionTitle>
        {children.length > 1 ? (
          <button
            type="button"
            onClick={() => (selection.active ? selection.clear() : selection.selectAll(childIds))}
            className="text-[12.5px] font-extrabold text-brand-600"
          >
            {selection.active ? 'Cancel' : 'Select for batch log'}
          </button>
        ) : null}
      </div>

      {loading ? (
        <>
          {[0, 1].map((index) => (
            <div key={index} className="ln-card mb-3 flex items-center gap-3.5 p-3.5">
              <div className="ln-skeleton h-12 w-12 rounded-[15px]" />
              <div className="flex-1">
                <div className="ln-skeleton mb-2 h-4 w-[55%]" />
                <div className="ln-skeleton h-3 w-[38%]" />
              </div>
            </div>
          ))}
        </>
      ) : children.length === 0 ? (
        <EmptyState
          emoji="🐣"
          title="No children yet"
          body="Add your first child to generate their parent invite code and start logging."
          action={<Button onClick={() => setAddOpen(true)}>Add your first child</Button>}
        />
      ) : (
        children.map((child) => (
          <ChildDashCard
            key={child.id}
            child={child}
            attendance={attendance[child.id]}
            unread={unread[child.id] ?? 0}
            settingId={settingId}
            billing={billing}
            selectionActive={selection.active}
            selected={selection.isSelected(child.id)}
            onOpen={() => navigate(`/app/child/${child.id}`)}
            onToggleSelect={() => selection.toggle(child.id)}
            onStartSelection={() => selection.start(child.id)}
            onOvertimeMore={() => setOvertimeChild(child)}
            onShareCode={() => void shareCode(child)}
            onQuickLog={() => setQuickLogChild(child)}
          />
        ))
      )}

      {/* Floating add button, tucked out of the way while batch-selecting. */}
      {!selection.active && children.length > 0 ? (
        <button
          type="button"
          aria-label="Add child"
          onClick={() => setAddOpen(true)}
          className="fixed bottom-[calc(78px+var(--safe-b))] right-[max(1.125rem,calc(50%-216px))] z-20 flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-[27px] text-white shadow-fab transition active:scale-90"
        >
          ＋
        </button>
      ) : null}

      {/* Batch action bar replaces the FAB while children are selected. */}
      {selection.active && selection.count > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(60px+var(--safe-b))] z-30 mx-auto max-w-app px-3.5">
          <div className="flex items-center gap-3 rounded-3xl bg-ink px-4 py-3 text-white shadow-lg">
            <span className="text-[13.5px] font-extrabold">
              {pluralise(selection.count, 'child', 'children')} selected
            </span>
            <button
              type="button"
              onClick={selection.clear}
              className="text-[12.5px] font-bold text-white/70 underline"
            >
              Clear
            </button>
            <Button size="sm" className="ml-auto" onClick={() => setBatchOpen(true)}>
              Log for all
            </Button>
          </div>
        </div>
      ) : null}

      <BatchLogSheet
        open={batchOpen}
        onClose={() => {
          setBatchOpen(false);
          selection.clear();
        }}
        settingId={settingId}
        children={selectedChildren}
      />

      <AddChildSheet open={addOpen} onClose={() => setAddOpen(false)} settingId={settingId} />

      <OvertimeSheet
        open={overtimeChild !== null}
        onClose={() => setOvertimeChild(null)}
        settingId={settingId}
        child={overtimeChild}
        billing={billing}
      />

      {quickLogChild ? (
        <DiaryComposer
          open
          onClose={() => setQuickLogChild(null)}
          settingId={settingId}
          child={quickLogChild}
        />
      ) : null}
    </div>
  );
}
