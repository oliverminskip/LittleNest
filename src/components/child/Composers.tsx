import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Chip, Field, TextArea, TextInput } from '@/components/ui/Primitives';
import { PhotoPicker } from './PhotoPicker';
import { ENTRY_TYPES, EYFS_AREAS, PORTIONS } from '@/lib/constants';
import { addEntry, addObservation } from '@/services/firebase/data';
import { uploadChildPhoto } from '@/services/firebase/storage';
import { useToast } from '@/hooks/useToast';
import { phoneForWhatsApp } from '@/lib/format';
import type { CompressedPhoto } from '@/lib/image';
import type { Child, EntryType, EyfsAreaKey } from '@/types';

const TYPE_KEYS = Object.keys(ENTRY_TYPES) as EntryType[];

export function DiaryComposer({
  open,
  onClose,
  settingId,
  child,
}: {
  open: boolean;
  onClose: () => void;
  settingId: string;
  child: Child;
}) {
  const [type, setType] = useState<EntryType>('meal');
  const [detail, setDetail] = useState('');
  const [portion, setPortion] = useState<string>(PORTIONS[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [photo, setPhoto] = useState<CompressedPhoto | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [alsoWhatsApp, setAlsoWhatsApp] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const meta = ENTRY_TYPES[type];

  const submit = async () => {
    if (!detail.trim() && !photo && !startTime && type !== 'nappy') {
      toast.error('Add a little detail', 'Or attach a photo before posting.');
      return;
    }

    setBusy(true);
    try {
      let photoUrl: string | undefined;
      let photoPath: string | undefined;

      if (photo) {
        setProgress(0);
        const uploaded = await uploadChildPhoto(settingId, child.id, photo.file, {
          onProgress: setProgress,
        });
        photoUrl = uploaded.url;
        photoPath = uploaded.path;
      }

      await addEntry(settingId, child.id, {
        type,
        detail: detail.trim(),
        ...(meta.times && startTime ? { startTime } : {}),
        ...(meta.times && endTime ? { endTime } : {}),
        ...(meta.portion ? { portion } : {}),
        ...(photoUrl ? { photoUrl, photoPath } : {}),
      });

      if (alsoWhatsApp) openWhatsApp(child, meta.label, meta.icon, detail);

      toast.success(`${meta.icon} Posted`, `${child.name.split(' ')[0]}'s parent has been updated`);
      setDetail('');
      setPhoto(null);
      setStartTime('');
      setEndTime('');
      onClose();
    } catch (err) {
      toast.error("Couldn't post that", (err as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New update"
      footer={
        <Button size="lg" fullWidth loading={busy} onClick={submit}>
          Post to parent
        </Button>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {TYPE_KEYS.map((key) => (
          <Chip key={key} active={key === type} onClick={() => setType(key)}>
            {ENTRY_TYPES[key].icon} {ENTRY_TYPES[key].label}
          </Chip>
        ))}
      </div>

      {type === 'photo' || photo ? (
        <PhotoPicker value={photo} onChange={setPhoto} progress={progress} />
      ) : null}

      {meta.portion ? (
        <Field label="How much did they eat?">
          <div className="flex gap-2">
            {PORTIONS.map((option) => (
              <Chip
                key={option}
                active={portion === option}
                onClick={() => setPortion(option)}
                className="flex-1 justify-center"
              >
                {option}
              </Chip>
            ))}
          </div>
        </Field>
      ) : null}

      {meta.times ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Asleep">
            <TextInput type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </Field>
          <Field label="Awake">
            <TextInput type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </Field>
        </div>
      ) : null}

      {meta.options ? (
        <Field label="Quick pick">
          <div className="flex flex-wrap gap-2">
            {meta.options.map((option) => (
              <Chip
                key={option}
                active={detail === option}
                onClick={() => setDetail(option)}
                className="flex-1 justify-center"
              >
                {option}
              </Chip>
            ))}
          </div>
        </Field>
      ) : null}

      <Field label="Detail">
        <TextArea
          rows={3}
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder={meta.placeholder}
        />
      </Field>

      {type !== 'photo' && !photo ? (
        <button
          type="button"
          onClick={() => setType('photo')}
          className="mb-4 text-[13.5px] font-extrabold text-brand-600 underline underline-offset-2"
        >
          📷 Add a photo instead
        </button>
      ) : null}

      <label className="mb-4 flex items-center gap-3 rounded-xl border border-moss/15 bg-moss-bg px-3.5 py-3">
        <input
          type="checkbox"
          checked={alsoWhatsApp}
          onChange={(event) => setAlsoWhatsApp(event.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-[13.5px] font-extrabold text-moss">
          📲 Also nudge the parent on WhatsApp
        </span>
      </label>
      <div className="h-2" />
    </Sheet>
  );
}

function openWhatsApp(child: Child, label: string, icon: string, detail: string) {
  const message = `Hi! New update for ${child.name} on LittleNest ${icon}\n\n${label}${
    detail ? `\n"${detail}"` : ''
  }`;
  const number = phoneForWhatsApp(child.parentPhone);
  window.open(
    number
      ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener',
  );
}

export function ObservationComposer({
  open,
  onClose,
  settingId,
  child,
}: {
  open: boolean;
  onClose: () => void;
  settingId: string;
  child: Child;
}) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [areas, setAreas] = useState<EyfsAreaKey[]>([]);
  const [photo, setPhoto] = useState<CompressedPhoto | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const toggleArea = (key: EyfsAreaKey) =>
    setAreas((previous) =>
      previous.includes(key) ? previous.filter((area) => area !== key) : [...previous, key],
    );

  const submit = async () => {
    if (!title.trim() || !note.trim() || !areas.length) {
      toast.error('Almost there', 'Add a title, a note and at least one EYFS area.');
      return;
    }

    setBusy(true);
    try {
      let photoUrl: string | undefined;
      let photoPath: string | undefined;
      if (photo) {
        setProgress(0);
        const uploaded = await uploadChildPhoto(settingId, child.id, photo.file, {
          onProgress: setProgress,
        });
        photoUrl = uploaded.url;
        photoPath = uploaded.path;
      }

      await addObservation(settingId, child.id, {
        title: title.trim(),
        note: note.trim(),
        areas,
        nextSteps: nextSteps.trim(),
        ...(photoUrl ? { photoUrl, photoPath } : {}),
      });

      toast.success('🌱 Saved to the journey', title.trim());
      setTitle('');
      setNote('');
      setNextSteps('');
      setAreas([]);
      setPhoto(null);
      onClose();
    } catch (err) {
      toast.error("Couldn't save", (err as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New observation"
      footer={
        <Button variant="gold" size="lg" fullWidth loading={busy} onClick={submit}>
          Save to journey
        </Button>
      }
    >
      <Field label="Title">
        <TextInput
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Building a tall tower"
        />
      </Field>

      <Field label="What did you see?">
        <TextArea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Describe the moment in your own words…"
        />
      </Field>

      <PhotoPicker value={photo} onChange={setPhoto} progress={progress} />

      <Field label="EYFS areas of learning">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(EYFS_AREAS) as EyfsAreaKey[]).map((key) => {
            const area = EYFS_AREAS[key];
            return (
              <Chip key={key} active={areas.includes(key)} onClick={() => toggleArea(key)}>
                <span
                  className="inline-block h-[7px] w-[7px] rounded-full"
                  style={{ background: area.colour }}
                />
                {area.short}
                {area.prime ? <span className="font-bold text-ink-faint"> ·prime</span> : null}
              </Chip>
            );
          })}
        </div>
      </Field>

      <Field label="Next steps (optional)">
        <TextArea
          rows={2}
          value={nextSteps}
          onChange={(event) => setNextSteps(event.target.value)}
          placeholder="How will you extend this?"
        />
      </Field>
      <div className="h-2" />
    </Sheet>
  );
}
