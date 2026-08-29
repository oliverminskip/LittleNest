import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, NumberInput, TextInput } from '@/components/ui/Primitives';
import { InfoCard, InfoRow } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { updateSetting } from '@/services/firebase/data';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_BILLING, DEFAULT_RATIO_LIMITS, PRICING } from '@/lib/constants';
import { formatMoney } from '@/lib/format';

export function SettingsScreen() {
  const { profile, setting, refresh, signOut } = useAuth();
  const toast = useToast();
  const settingId = profile?.settingId ?? '';

  const [billing, setBilling] = useState({ ...DEFAULT_BILLING, ...(setting?.billing ?? {}) });
  const [limits, setLimits] = useState({ ...DEFAULT_RATIO_LIMITS, ...(setting?.ratioLimits ?? {}) });
  const [urn, setUrn] = useState(setting?.ofstedUrn ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateSetting(settingId, { billing, ratioLimits: limits, ofstedUrn: urn.trim() });
      await refresh();
      toast.success('✓ Saved', 'Your setting has been updated');
    } catch (err) {
      toast.error("Couldn't save", (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="mb-5 text-[30px]">Settings</h1>

      <InfoCard title="🪺 Your setting">
        <InfoRow label="Name" value={setting?.name ?? '—'} />
        <InfoRow label="Signed in as" value={<span className="text-[12px]">{profile?.email}</span>} />
        <InfoRow label="Plan" value={`LittleNest · £${PRICING.monthly}/mo`} />
      </InfoCard>

      <Field label="Ofsted URN" hint="Printed on your invoices and register exports.">
        <TextInput value={urn} onChange={(event) => setUrn(event.target.value)} placeholder="e.g. EY123456" />
      </Field>

      <p className="ln-eyebrow mb-3 mt-6">Rates</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hourly rate">
          <NumberInput
            value={billing.hourlyRate}
            onChange={(value) => setBilling((previous) => ({ ...previous, hourlyRate: value }))}
            step={0.25}
            prefix="£"
          />
        </Field>
        <Field label="Overtime multiple" hint={`= ${formatMoney(billing.hourlyRate * billing.lateMultiplier)}/h`}>
          <NumberInput
            value={billing.lateMultiplier}
            onChange={(value) => setBilling((previous) => ({ ...previous, lateMultiplier: value }))}
            step={0.25}
            suffix="×"
          />
        </Field>
        <Field label="Meals a day">
          <NumberInput
            value={billing.mealsPerDay}
            onChange={(value) => setBilling((previous) => ({ ...previous, mealsPerDay: value }))}
            step={0.5}
            prefix="£"
          />
        </Field>
        <Field label="Consumables a day">
          <NumberInput
            value={billing.consumablesPerDay}
            onChange={(value) => setBilling((previous) => ({ ...previous, consumablesPerDay: value }))}
            step={0.5}
            prefix="£"
          />
        </Field>
        <Field label="Council funded rate" className="col-span-2">
          <NumberInput
            value={billing.fundedHourlyRate}
            onChange={(value) => setBilling((previous) => ({ ...previous, fundedHourlyRate: value }))}
            step={0.01}
            prefix="£"
          />
        </Field>
      </div>

      <p className="ln-eyebrow mb-3 mt-4">Ratio limits</p>
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-sub">
        These default to the statutory England limits for a childminder working alone. Only change
        them if Ofsted has agreed a variation — for siblings or continuity of care, for example.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Under 1">
          <NumberInput
            value={limits.underOne}
            onChange={(value) => setLimits((previous) => ({ ...previous, underOne: value }))}
            max={6}
          />
        </Field>
        <Field label="Under 5">
          <NumberInput
            value={limits.underFive}
            onChange={(value) => setLimits((previous) => ({ ...previous, underFive: value }))}
            max={6}
          />
        </Field>
        <Field label="Under 8">
          <NumberInput
            value={limits.underEight}
            onChange={(value) => setLimits((previous) => ({ ...previous, underEight: value }))}
            max={12}
          />
        </Field>
      </div>

      <Button fullWidth size="lg" loading={saving} onClick={save}>
        Save settings
      </Button>

      <Button variant="ghost" fullWidth className="mt-3" onClick={() => void signOut()}>
        Sign out
      </Button>

      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-ink-faint">
        LittleNest keeps your data in your own setting. Photos are compressed on your device before
        upload and are never shared beyond the parents you link.
      </p>
    </div>
  );
}
