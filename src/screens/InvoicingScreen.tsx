import { InvoicesScreen } from '@/components/invoicing/InvoicesScreen';
import { Spinner } from '@/components/ui/Primitives';
import { useAuth } from '@/hooks/useAuth';
import { useChildren } from '@/hooks/useChildren';

export function InvoicingScreen() {
  const { profile, setting, user } = useAuth();
  const settingId = profile?.settingId ?? '';
  const { data: children, loading } = useChildren(settingId, 'minder', user?.uid);

  if (loading || !setting) return <Spinner />;

  return (
    <div>
      <h1 className="mb-1 text-[30px]">Invoicing</h1>
      <p className="mb-5 text-[13.5px] font-semibold leading-relaxed text-ink-sub">
        Funded hours, meals, consumables and every logged overtime punch, pulled together into a
        PDF you can send.
      </p>
      <InvoicesScreen settingId={settingId} setting={setting} children={children} />
    </div>
  );
}
