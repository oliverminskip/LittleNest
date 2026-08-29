import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatTab, ChildHeader, DiaryTab, JourneyTab, ProfileTab } from '@/components/child/tabs';
import { DiaryComposer, ObservationComposer } from '@/components/child/Composers';
import { Spinner } from '@/components/ui/Primitives';
import { useAuth } from '@/hooks/useAuth';
import { useChildren } from '@/hooks/useChildren';
import { useUnreadCounts } from '@/hooks/useChildData';
import { deleteChild } from '@/services/firebase/data';
import { formatAge } from '@/lib/dates';
import { cn } from '@/lib/format';
import { useToast } from '@/hooks/useToast';

type Tab = 'diary' | 'journey' | 'chat' | 'profile';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'diary', label: 'Diary', icon: '📔' },
  { key: 'journey', label: 'Journey', icon: '🌱' },
  { key: 'chat', label: 'Messages', icon: '💬' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

export function ChildScreen() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, user, isMinder } = useAuth();
  const settingId = profile?.settingId ?? '';

  const { data: children, loading } = useChildren(settingId, profile?.role ?? 'parent', user?.uid);
  const child = useMemo(() => children.find((candidate) => candidate.id === childId), [children, childId]);
  const unread = useUnreadCounts(settingId, childId ? [childId] : [], isMinder ? 'minder' : 'parent');

  const [tab, setTab] = useState<Tab>('diary');
  const [composerOpen, setComposerOpen] = useState(false);

  if (loading) return <Spinner />;
  if (!child) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-bold text-ink-sub">We couldn't find that child.</p>
        <button
          type="button"
          onClick={() => navigate(isMinder ? '/app' : '/parent')}
          className="mt-3 text-[14px] font-extrabold text-brand-600 underline"
        >
          Back to your children
        </button>
      </div>
    );
  }

  const remove = async () => {
    if (!window.confirm(`Permanently delete ${child.name}'s profile and all records?`)) return;
    try {
      await deleteChild(settingId, child);
      toast.success('Profile deleted', child.name);
      navigate('/app');
    } catch (err) {
      toast.error("Couldn't delete", (err as Error).message);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(isMinder ? '/app' : '/parent')}
        className="inline-flex items-center gap-1 py-1.5 text-[13.5px] font-extrabold text-ink-sub"
      >
        ‹ {isMinder ? 'Home' : 'My children'}
      </button>

      <ChildHeader
        child={child}
        subtitle={isMinder ? formatAge(child.dob) || 'Childminder view' : 'Today'}
      />

      <div className="mt-5">
        {tab === 'diary' ? <DiaryTab settingId={settingId} child={child} isMinder={isMinder} /> : null}
        {tab === 'journey' ? <JourneyTab settingId={settingId} child={child} isMinder={isMinder} /> : null}
        {tab === 'chat' ? (
          <ChatTab settingId={settingId} child={child} role={isMinder ? 'minder' : 'parent'} />
        ) : null}
        {tab === 'profile' ? (
          <ProfileTab settingId={settingId} child={child} isMinder={isMinder} onDelete={remove} />
        ) : null}
      </div>

      {isMinder && (tab === 'diary' || tab === 'journey') ? (
        <button
          type="button"
          aria-label={tab === 'diary' ? 'Add update' : 'Add observation'}
          onClick={() => setComposerOpen(true)}
          className="fixed bottom-[calc(78px+var(--safe-b))] right-[max(1.125rem,calc(50%-216px))] z-20 flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-[27px] text-white shadow-fab transition active:scale-90"
        >
          ＋
        </button>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-app border-t border-line bg-white/90 px-1.5 pb-[calc(7px+var(--safe-b))] pt-1.5 backdrop-blur-xl">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10.5px] font-extrabold transition',
              tab === item.key ? 'text-brand-500' : 'text-ink-faint',
            )}
          >
            <span className={cn('text-[21px] leading-none transition', tab === item.key && '-translate-y-0.5 scale-110')}>
              {item.icon}
            </span>
            {item.key === 'profile' && !isMinder ? 'Details' : item.label}
            {item.key === 'chat' && (unread[child.id] ?? 0) > 0 ? (
              <span className="absolute right-[calc(50%-22px)] top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose px-1 text-[10px] font-black text-white">
                {unread[child.id]}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {tab === 'diary' ? (
        <DiaryComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          settingId={settingId}
          child={child}
        />
      ) : (
        <ObservationComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          settingId={settingId}
          child={child}
        />
      )}
    </div>
  );
}
