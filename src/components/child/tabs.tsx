import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Avatar, EmptyState, Pill, Spinner } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { Card, InfoCard, InfoRow } from '@/components/ui/Card';
import { ENTRY_TYPES, EYFS_AREAS } from '@/lib/constants';
import {
  dateKeyOfStamp,
  formatDate,
  formatTime,
  fromDateKey,
  recentDays,
  toDateKey,
  todayKey,
} from '@/lib/dates';
import { cn, phoneForWhatsApp } from '@/lib/format';
import { useEntries, useMessages, useObservations } from '@/hooks/useChildData';
import { markThreadRead, sendMessage, updateChild } from '@/services/firebase/data';
import { paths } from '@/services/firebase/paths';
import { useToast } from '@/hooks/useToast';
import type { Attendance, Child, DiaryEntry, EyfsAreaKey, Message, Role } from '@/types';

/* ── Diary ────────────────────────────────────────────────── */

export function DiaryTab({
  settingId,
  child,
  isMinder,
}: {
  settingId: string;
  child: Child;
  isMinder: boolean;
}) {
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const { data: entries, loading } = useEntries(settingId, child.id);

  useEffect(() => {
    let cancelled = false;
    void getDoc(doc(paths.attendanceCollection(settingId, child.id), selectedDay))
      .then((snap) => {
        if (!cancelled) setAttendance(snap.exists() ? (snap.data() as Attendance) : null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [settingId, child.id, selectedDay]);

  const dayEntries = useMemo(
    () => entries.filter((entry) => dateKeyOfStamp(entry.createdAt) === selectedDay),
    [entries, selectedDay],
  );

  const shareSummary = () => {
    const label =
      selectedDay === todayKey()
        ? 'today'
        : fromDateKey(selectedDay).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });

    const lines = [...dayEntries]
      .reverse()
      .map((entry) => {
        const meta = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.note;
        let extra = '';
        if (entry.startTime && entry.endTime) extra = ` (${entry.startTime}–${entry.endTime})`;
        else if (entry.portion) extra = ` — ate ${entry.portion.toLowerCase()}`;
        return `${meta.icon} ${formatTime(entry.createdAt)} ${meta.label}${extra}${
          entry.detail ? `: ${entry.detail}` : ''
        }`;
      })
      .join('\n');

    const message = `🪺 ${child.name}'s day — ${label}\n\n${lines}\n\nShared via LittleNest`;
    if (navigator.share) void navigator.share({ title: `${child.name}'s day`, text: message }).catch(() => undefined);
    else void navigator.clipboard?.writeText(message);
  };

  return (
    <div>
      <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-0.5 ln-no-scrollbar">
        {recentDays(7).map((day) => {
          const key = toDateKey(day);
          const isToday = key === todayKey();
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(key)}
              className={cn(
                'min-w-[50px] shrink-0 rounded-xl border-[1.5px] px-1.5 py-2 text-center transition',
                key === selectedDay ? 'border-ink bg-ink text-white' : 'border-line bg-white',
              )}
            >
              <span
                className={cn(
                  'block text-[10.5px] font-extrabold uppercase',
                  key === selectedDay ? 'text-white' : 'text-ink-sub',
                )}
              >
                {isToday ? 'Today' : day.toLocaleDateString('en-GB', { weekday: 'short' })}
              </span>
              <span className="mt-0.5 block text-[17px] font-black">{day.getDate()}</span>
            </button>
          );
        })}
      </div>

      {attendance?.signInAt || attendance?.signOutAt ? (
        <div className="mb-3 flex items-center gap-3.5 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-moss-bg text-[20px]">🕗</span>
          <div>
            <p className="text-[13px] font-black">Attendance</p>
            <p className="text-[13px] font-bold text-ink-sub">
              {attendance.signInAt ? `In ${formatTime(attendance.signInAt)}` : '—'}
              {attendance.signOutAt
                ? ` · Out ${formatTime(attendance.signOutAt)}`
                : attendance.signInAt
                  ? ' · still in'
                  : ''}
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <Spinner />
      ) : dayEntries.length === 0 ? (
        <EmptyState
          emoji="☀️"
          title={`Nothing logged ${selectedDay === todayKey() ? 'yet today' : 'that day'}`}
          body={isMinder ? 'Tap + to add the first update.' : 'Check back later for updates.'}
        />
      ) : (
        <>
          <Card padded={false} className="px-3 py-2">
            {dayEntries.map((entry, index) => (
              <TimelineRow key={entry.id} entry={entry} last={index === dayEntries.length - 1} />
            ))}
          </Card>
          {isMinder ? (
            <Button variant="soft" fullWidth className="mt-3.5" onClick={shareSummary}>
              📋 Share {child.name.split(' ')[0]}'s day summary
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function TimelineRow({ entry, last }: { entry: DiaryEntry; last: boolean }) {
  const meta = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.note;

  return (
    <div className="flex gap-3.5">
      <div className="flex shrink-0 flex-col items-center">
        <span
          className="flex h-[38px] w-[38px] items-center justify-center rounded-xl text-[18px]"
          style={{ background: meta.tint }}
        >
          {meta.icon}
        </span>
        {last ? null : <span className="my-0.5 w-0.5 flex-1 bg-line" />}
      </div>

      <div className={cn('min-w-0 flex-1', last ? 'pb-1' : 'pb-4')}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[14.5px] font-black">
            {meta.label}
            {entry.startTime && entry.endTime ? (
              <span className="ml-1.5">
                <Pill tone="gold">
                  {entry.startTime}–{entry.endTime}
                </Pill>
              </span>
            ) : entry.portion ? (
              <span className="ml-1.5">
                <Pill tone="gold">Ate {entry.portion.toLowerCase()}</Pill>
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-[12px] font-extrabold text-ink-sub">
            {formatTime(entry.createdAt)}
          </span>
        </div>

        {entry.detail ? (
          <p className="mt-0.5 text-[14px] leading-relaxed text-ink-soft">{entry.detail}</p>
        ) : null}

        {entry.photoUrl ? (
          <img
            src={entry.photoUrl}
            alt={entry.detail || meta.label}
            loading="lazy"
            className="mt-2 max-h-72 w-full rounded-2xl border border-line object-cover"
          />
        ) : null}

        {entry.batchId ? (
          <p className="mt-1 text-[11px] font-bold text-ink-faint">Logged as part of a group update</p>
        ) : null}
      </div>
    </div>
  );
}

/* ── Journey ──────────────────────────────────────────────── */

export function JourneyTab({
  settingId,
  child,
  isMinder,
}: {
  settingId: string;
  child: Child;
  isMinder: boolean;
}) {
  const { data: observations, loading } = useObservations(settingId, child.id);

  const coverage = useMemo(() => {
    const counts = {} as Record<EyfsAreaKey, number>;
    observations.forEach((observation) =>
      (observation.areas ?? []).forEach((area) => {
        counts[area] = (counts[area] ?? 0) + 1;
      }),
    );
    return counts;
  }, [observations]);

  if (loading) return <Spinner />;

  return (
    <div>
      {!isMinder ? (
        <p className="mb-3.5 text-[13px] font-semibold leading-relaxed text-ink-sub">
          {child.name}'s learning journey — captured against the EYFS areas of learning.
        </p>
      ) : null}

      {observations.length > 0 ? (
        <Card className="mb-3.5">
          <p className="mb-2.5 text-[13px] font-black">EYFS coverage</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(EYFS_AREAS) as EyfsAreaKey[]).map((key) => {
              const area = EYFS_AREAS[key];
              const count = coverage[key] ?? 0;
              return (
                <span
                  key={key}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-extrabold',
                    count === 0 && 'opacity-40',
                  )}
                  style={{ background: `${area.colour}22` }}
                >
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: area.colour }} />
                  {area.short} {count}
                </span>
              );
            })}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-sub">
            Faded areas have no observations yet — useful for spotting gaps before an inspection.
          </p>
        </Card>
      ) : null}

      {observations.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="No observations yet"
          body={
            isMinder
              ? 'Capture a magic moment and tag it to the EYFS areas of learning.'
              : "Observations will appear here as they're added."
          }
        />
      ) : (
        observations.map((observation) => (
          <Card key={observation.id} padded={false} className="mb-3 animate-rise">
            {observation.photoUrl ? (
              <img
                src={observation.photoUrl}
                alt={observation.title}
                loading="lazy"
                className="max-h-72 w-full object-cover"
              />
            ) : null}

            <div className="p-4">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="font-display text-[19px] font-semibold leading-tight">
                  {observation.title}
                </span>
                <span className="shrink-0 text-[12px] font-extrabold text-ink-sub">
                  {formatDate(observation.createdAt)}
                </span>
              </div>

              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {(observation.areas ?? []).map((key) => {
                  const area = EYFS_AREAS[key];
                  if (!area) return null;
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-extrabold text-ink-soft"
                      style={{ background: `${area.colour}22` }}
                    >
                      <span className="h-[7px] w-[7px] rounded-full" style={{ background: area.colour }} />
                      {area.short}
                    </span>
                  );
                })}
              </div>

              <p className="text-[14.5px] leading-relaxed">{observation.note}</p>

              {observation.nextSteps ? (
                <div className="mt-3 rounded-xl border-l-[3px] border-gold bg-gold-bg px-3.5 py-3">
                  <p className="mb-0.5 text-[11px] font-black uppercase tracking-wide text-gold">
                    Next steps
                  </p>
                  <p className="text-[13.5px] leading-snug">{observation.nextSteps}</p>
                </div>
              ) : null}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

/* ── Chat ─────────────────────────────────────────────────── */

export function ChatTab({
  settingId,
  child,
  role,
}: {
  settingId: string;
  child: Child;
  role: Role;
}) {
  const { data: messages, loading } = useMessages(settingId, child.id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Opening the thread is the read receipt.
  useEffect(() => {
    void markThreadRead(settingId, child.id, role).catch(() => undefined);
  }, [settingId, child.id, role, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setSending(true);
    try {
      await sendMessage(settingId, child.id, role, text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pb-28">
      {loading ? (
        <Spinner />
      ) : messages.length === 0 ? (
        <EmptyState
          emoji="👋"
          title="Say hello"
          body={`Messages between you and ${role === 'minder' ? 'the parent' : 'your childminder'} appear here.`}
        />
      ) : (
        messages.map((message: Message) => {
          const mine = message.from === role;
          return (
            <div key={message.id} className={cn('mb-2 flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-snug shadow-sm',
                  mine
                    ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
                    : 'border border-line bg-white',
                )}
              >
                {message.text}
                <p className={cn('mt-1 text-[10.5px] opacity-70', mine ? 'text-right' : 'text-left')}>
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })
      )}
      <div ref={endRef} />

      <div className="fixed inset-x-0 bottom-[calc(56px+var(--safe-b))] z-30 mx-auto flex max-w-app gap-2 border-t border-line bg-white/95 px-3.5 py-3 backdrop-blur">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void send();
          }}
          placeholder="Message…"
          className="ln-input"
          autoComplete="off"
        />
        <Button onClick={send} loading={sending} className="shrink-0">
          Send
        </Button>
      </div>
    </div>
  );
}

/* ── Profile ──────────────────────────────────────────────── */

export function ProfileTab({
  settingId,
  child,
  isMinder,
  onDelete,
}: {
  settingId: string;
  child: Child;
  isMinder: boolean;
  onDelete: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    parentName: child.parentName ?? '',
    parentPhone: child.parentPhone ?? '',
    emergencyName: child.emergencyName ?? '',
    emergencyPhone: child.emergencyPhone ?? '',
    medicalNotes: child.medicalNotes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const whatsApp = phoneForWhatsApp(child.parentPhone);

  if (isMinder) {
    return (
      <div>
        <InfoCard title="👤 Parent details">
          <InfoRow label="Name" value={child.parentName || 'Not provided'} />
          <InfoRow label="Mobile" value={child.parentPhone || 'Not provided'} />
          <InfoRow
            label="Email"
            value={<span className="text-[12px]">{(child.parentEmails ?? [])[0] ?? '—'}</span>}
          />
        </InfoCard>

        <InfoCard title="🚨 Emergency contact">
          <InfoRow label="Name" value={child.emergencyName || 'Not provided'} />
          <InfoRow label="Phone" value={child.emergencyPhone || 'Not provided'} />
        </InfoCard>

        {child.medicalNotes ? (
          <div className="mb-3 rounded-2xl border border-line border-l-[3px] border-l-rose bg-white p-4 shadow-sm">
            <p className="mb-2 text-[14px] font-black">🏥 Medical notes</p>
            <p className="text-[14px] leading-relaxed">{child.medicalNotes}</p>
          </div>
        ) : null}

        {whatsApp ? (
          <Button
            variant="green"
            fullWidth
            className="mt-2"
            onClick={() =>
              window.open(
                `https://wa.me/${whatsApp}?text=${encodeURIComponent(
                  `Hi ${child.parentName ?? ''}! Quick update from LittleNest 🪺`,
                )}`,
                '_blank',
                'noopener',
              )
            }
          >
            💬 WhatsApp {(child.parentName || 'parent').split(' ')[0]}
          </Button>
        ) : (
          <p className="mt-4 text-center text-[13px] text-ink-sub">
            The parent hasn't added their mobile number yet.
          </p>
        )}

        <Button variant="danger" fullWidth className="mt-5" onClick={onDelete}>
          Delete {child.name}'s profile
        </Button>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await updateChild(settingId, child.id, form);
      toast.success('✓ Saved', 'Your details are up to date');
    } catch (err) {
      toast.error("Couldn't save", (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; placeholder: string; type?: string }[] = [
    { key: 'parentName', label: 'Your name', placeholder: 'Full name' },
    { key: 'parentPhone', label: 'Your mobile', placeholder: '07700 900123', type: 'tel' },
    { key: 'emergencyName', label: 'Emergency contact name', placeholder: 'Name' },
    { key: 'emergencyPhone', label: 'Emergency contact number', placeholder: '07700 900456', type: 'tel' },
  ];

  return (
    <div>
      {fields.map((field) => (
        <div key={field.key} className="mb-4">
          <div className="ln-label">{field.label}</div>
          <input
            className="ln-input"
            type={field.type ?? 'text'}
            value={form[field.key]}
            placeholder={field.placeholder}
            onChange={(event) => setForm((previous) => ({ ...previous, [field.key]: event.target.value }))}
          />
        </div>
      ))}

      <div className="mb-4">
        <div className="ln-label">Medical notes</div>
        <textarea
          className="ln-input resize-none"
          rows={3}
          value={form.medicalNotes}
          placeholder="Allergies, medication, GP details…"
          onChange={(event) => setForm((previous) => ({ ...previous, medicalNotes: event.target.value }))}
        />
      </div>

      <Button fullWidth loading={saving} onClick={save}>
        Save details
      </Button>
    </div>
  );
}

/** Small header used above each child view. */
export function ChildHeader({ child, subtitle }: { child: Child; subtitle: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-3">
      <Avatar name={child.name} colour={child.colour} size="lg" />
      <div>
        <h1 className="text-[27px]" style={{ color: child.colour || '#6C5CE7' }}>
          {child.name}
        </h1>
        <p className="mt-0.5 text-[13px] font-bold text-ink-sub">{subtitle}</p>
      </div>
    </div>
  );
}
