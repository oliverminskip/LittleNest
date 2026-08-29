import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorNote, Field, TextInput } from '@/components/ui/Primitives';
import { createSetting, friendlyAuthError, redeemInvite } from '@/services/firebase/auth';
import { useAuth } from '@/hooks/useAuth';

type Step = 'choose' | 'setting' | 'invite';

/**
 * Shown when someone is authenticated but has no `users/{uid}` document —
 * the one moment where role is decided. Everything after this is routed
 * automatically from the stored profile.
 */
export function OnboardingScreen() {
  const { user, refresh, signOut } = useAuth();
  const [step, setStep] = useState<Step>('choose');
  const [settingName, setSettingName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const makeSetting = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !settingName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createSetting(user, settingName);
      await refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const linkChild = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await redeemInvite(user, code);
      await refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-app px-6 pb-10 pt-16 text-center">
      <div className="mx-auto mb-5 flex h-[78px] w-[78px] items-center justify-center rounded-4xl bg-gradient-to-br from-brand-400 to-brand-700 text-[38px] shadow-lg">
        🪺
      </div>

      {step === 'choose' ? (
        <>
          <h1 className="text-[36px]">Welcome</h1>
          <p className="mb-8 mt-1.5 font-semibold text-ink-sub">How will you be using LittleNest?</p>

          <Button size="lg" fullWidth className="mb-3 flex-col !gap-0.5" onClick={() => setStep('setting')}>
            <span>I'm a childminder</span>
            <span className="text-[12px] font-semibold opacity-90">Set up my setting</span>
          </Button>

          <Button
            size="lg"
            variant="ghost"
            fullWidth
            className="mb-3 flex-col !gap-0.5"
            onClick={() => setStep('invite')}
          >
            <span>I'm a parent</span>
            <span className="text-[12px] font-semibold text-ink-sub">Link to my child</span>
          </Button>
        </>
      ) : step === 'setting' ? (
        <form onSubmit={makeSetting}>
          <h2 className="text-[30px]">Name your setting</h2>
          <p className="mb-6 mt-2 font-semibold text-ink-sub">e.g. Francesca's Little Stars</p>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <Field>
            <TextInput
              value={settingName}
              onChange={(event) => setSettingName(event.target.value)}
              placeholder="Setting name"
              required
              autoFocus
            />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={busy}>
            Create setting
          </Button>
          <Button variant="plain" fullWidth className="mt-2" onClick={() => setStep('choose')}>
            Back
          </Button>
        </form>
      ) : (
        <form onSubmit={linkChild}>
          <h2 className="text-[28px]">Link to your child</h2>
          <p className="mb-6 mt-2.5 font-semibold leading-relaxed text-ink-sub">
            Enter the setup code your childminder gave you.
          </p>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <Field>
            <TextInput
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="LN-X4A2"
              className="text-center font-mono text-[22px] tracking-[3px]"
              autoCapitalize="characters"
              required
              autoFocus
            />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={busy}>
            Link my child
          </Button>
          <Button variant="plain" fullWidth className="mt-2" onClick={() => setStep('choose')}>
            Back
          </Button>
        </form>
      )}

      <Button variant="plain" fullWidth className="mt-6" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}
