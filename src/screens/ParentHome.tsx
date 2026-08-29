import { Navigate, useNavigate } from 'react-router-dom';
import { Avatar, EmptyState, Spinner } from '@/components/ui/Primitives';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useChildren } from '@/hooks/useChildren';
import { useUnreadCounts } from '@/hooks/useChildData';
import { formatAge } from '@/lib/dates';

/**
 * The parent's landing view.
 *
 * A parent with exactly one child — the overwhelming majority — is sent
 * straight into that child, because an index page listing one item is a tap
 * they should never have to make.
 */
export function ParentHome() {
  const { profile, user, setting } = useAuth();
  const navigate = useNavigate();
  const settingId = profile?.settingId ?? '';

  const { data: children, loading } = useChildren(settingId, 'parent', user?.uid);
  const unread = useUnreadCounts(settingId, children.map((child) => child.id), 'parent');

  if (loading) return <Spinner />;

  if (children.length === 1) return <Navigate to={`/parent/child/${children[0].id}`} replace />;

  return (
    <div>
      <h1 className="mb-1 text-[30px]">My children</h1>
      {setting?.name ? (
        <p className="mb-5 text-[13.5px] font-bold text-ink-sub">at {setting.name}</p>
      ) : null}

      {children.length === 0 ? (
        <EmptyState
          emoji="🔗"
          title="No children linked yet"
          body="Ask your childminder for a new invite code and enter it to connect."
          action={<Button onClick={() => navigate('/onboarding')}>Enter an invite code</Button>}
        />
      ) : (
        children.map((child) => (
          <Card
            key={child.id}
            tappable
            className="mb-3 flex animate-rise items-center gap-3.5"
            onClick={() => navigate(`/parent/child/${child.id}`)}
          >
            <Avatar name={child.name} colour={child.colour} />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-black">{child.name}</p>
              {formatAge(child.dob) ? (
                <p className="text-[12.5px] font-bold text-ink-sub">{formatAge(child.dob)}</p>
              ) : null}
            </div>
            {(unread[child.id] ?? 0) > 0 ? (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose px-1.5 text-[11px] font-black text-white">
                {unread[child.id]}
              </span>
            ) : null}
            <span className="text-[22px] text-ink-faint">›</span>
          </Card>
        ))
      )}
    </div>
  );
}
