import { useMemo, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Chip, Field, TextArea, TextInput } from '@/components/ui/Primitives';
import { ENTRY_TYPES, PORTIONS } from '@/lib/constants';
import { addEntryToMany, undoBatch, type NewEntry } from '@/services/firebase/data';
import { useToast } from '@/hooks/useToast';
import { pluralise } from '@/lib/format';
import type { Child, EntryType } from '@/types';

interface BatchLogSheetProps {
  open: boolean;
  onClose: () => void;
  settingId: string;
  children: Child[];
  /** Pre-selected type when the sheet is opened from a quick-action button. */
  initialType?: EntryType;
}

const BATCHABLE = (Object.keys(ENTRY_TYPES) as EntryType[]).filter((key) => ENTRY_TYPES[key].batchable);

/**
 * Batch logging — the flagship one-handed action.
 *
 * The whole sheet is reachable with a thumb: type chips at the top, one
 * optional detail, then a full-width commit button pinned to the bottom above
 * the home indicator. The write is atomic (see `addEntryToMany`) and comes back
 * with an Undo, because the cost of a mis-tap when your hands are full should
 * be one more tap, not five corrections.
 */
export function BatchLogSheet({ open, onClose, settingId, children, initialType }: BatchLogSheetProps) {
  const [type, setType] = useState<EntryType>(initialType ?? 'meal');
  const [detail, setDetail] = useState('');
  const [portion, setPortion] = useState<string>(PORTIONS[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const meta = ENTRY_TYPES[type];
  const names = useMemo(() => children.map((child) => child.name.split(' ')[0]).join(', '), [children]);

  const reset = () => {
    setDetail('');
    setStartTime('');
    setEndTime('');
    setPortion(PORTIONS[0]);
  };

  const submit = async () => {
    if (!children.length) return;
    setBusy(true);

    const entry: NewEntry = { type, detail: detail.trim() };
    if (meta.times) {
      if (startTime) entry.startTime = startTime;
      if (endTime) entry.endTime = endTime;
    }
    if (meta.portion) entry.portion = portion;

    try {
      const childIds = children.map((child) => child.id);
      const batchId = await addEntryToMany(settingId, childIds, entry);

      toast.success(
        `${meta.icon} ${meta.label} logged`,
        `${pluralise(children.length, 'child', 'children')} updated`,
        {
          label: 'Undo',
          onClick: () => {
            void undoBatch(settingId, childIds, batchId).then(() =>
              toast.toast('Undone', 'That batch has been removed'),
            );
          },
        },
      );

      reset();
      onClose();
    } catch (err) {
      toast.error("Couldn't save", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Log for ${children.length === 1 ? names : pluralise(children.length, 'child', 'children')}`}
      footer={
        <Button size="lg" fullWidth loading={busy} onClick={submit}>
          {meta.icon} Log {meta.label.toLowerCase()} for {children.length}
        </Button>
      }
    >
      <p className="mb-4 text-[13.5px] font-bold leading-snug text-ink-sub">{names}</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {BATCHABLE.map((key) => (
          <Chip key={key} active={key === type} onClick={() => setType(key)}>
            {ENTRY_TYPES[key].icon} {ENTRY_TYPES[key].label}
          </Chip>
        ))}
      </div>

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

      <Field
        label="Detail"
        hint="Shared with every parent in this batch — keep it about the group, not one child."
      >
        <TextArea
          rows={3}
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder={meta.placeholder}
        />
      </Field>
      <div className="h-2" />
    </Sheet>
  );
}
