import type { BillingDefaults, EntryType, EyfsAreaKey, RatioLimits } from '@/types';

export const APP_NAME = 'LittleNest';
export const APP_TAGLINE = 'The warm little app for childminders & families';

/** Statutory England ratios for a childminder working alone (EYFS framework). */
export const DEFAULT_RATIO_LIMITS: RatioLimits = {
  underOne: 1,
  underFive: 3,
  underEight: 6,
};

export const DEFAULT_BILLING: BillingDefaults = {
  hourlyRate: 6.5,
  dailyRate: 55,
  consumablesPerDay: 3,
  mealsPerDay: 3.5,
  fundedHourlyRate: 5.62,
  lateMultiplier: 1.5,
};

/** The statutory term-time offer is 38 weeks a year. */
export const FUNDED_WEEKS_PER_YEAR = 38;
export const DEFAULT_STRETCH_WEEKS = 51;

export const PRICING = {
  monthly: 5,
  yearly: 39.99,
  competitorMonthly: 49,
} as const;

export interface EyfsArea {
  short: string;
  label: string;
  prime: boolean;
  colour: string;
}

export const EYFS_AREAS: Record<EyfsAreaKey, EyfsArea> = {
  cl: { short: 'C&L', label: 'Communication & Language', prime: true, colour: '#7FA8C9' },
  pd: { short: 'PD', label: 'Physical Development', prime: true, colour: '#C26B4E' },
  psed: { short: 'PSED', label: 'Personal, Social & Emotional', prime: true, colour: '#D9A441' },
  lit: { short: 'Lit', label: 'Literacy', prime: false, colour: '#8E6BA8' },
  ma: { short: 'Maths', label: 'Mathematics', prime: false, colour: '#5B9A8B' },
  utw: { short: 'UtW', label: 'Understanding the World', prime: false, colour: '#A8924E' },
  ead: { short: 'EAD', label: 'Expressive Arts & Design', prime: false, colour: '#C76B8A' },
};

export interface EntryTypeMeta {
  label: string;
  icon: string;
  tint: string;
  placeholder: string;
  /** Batch-loggable types appear in the multi-select action bar. */
  batchable: boolean;
  portion?: boolean;
  times?: boolean;
  options?: string[];
}

export const ENTRY_TYPES: Record<EntryType, EntryTypeMeta> = {
  meal: {
    label: 'Meal',
    icon: '🍽️',
    tint: '#EEE8FB',
    placeholder: 'What did they eat?',
    batchable: true,
    portion: true,
  },
  nap: {
    label: 'Nap',
    icon: '😴',
    tint: '#E4ECF4',
    placeholder: 'How did they sleep?',
    batchable: true,
    times: true,
  },
  nappy: {
    label: 'Nappy',
    icon: '🧷',
    tint: '#EDE6F4',
    placeholder: 'Wet / dirty / dry',
    batchable: true,
    options: ['Wet', 'Dirty', 'Dry'],
  },
  bottle: {
    label: 'Bottle',
    icon: '🍼',
    tint: '#E9F0F6',
    placeholder: 'How many oz / ml?',
    batchable: true,
  },
  activity: {
    label: 'Activity',
    icon: '🧩',
    tint: '#E5F1E6',
    placeholder: 'What did they get up to?',
    batchable: true,
  },
  mood: {
    label: 'Mood',
    icon: '😊',
    tint: '#FBF1DC',
    placeholder: 'How were they feeling?',
    batchable: true,
    options: ['Happy', 'Settled', 'Tired', 'Upset', 'Poorly'],
  },
  note: {
    label: 'Note',
    icon: '📝',
    tint: '#F2ECE6',
    placeholder: 'Anything to share…',
    batchable: true,
  },
  photo: {
    label: 'Photo',
    icon: '📷',
    tint: '#F0E9F7',
    placeholder: 'Add a caption…',
    batchable: false,
  },
};

export const PORTIONS = ['All', 'Most', 'Some', 'None'] as const;

export const CHILD_COLOURS = [
  '#6C5CE7',
  '#5B7B6F',
  '#C26B4E',
  '#9A7BB0',
  '#D9A441',
  '#5B9A8B',
  '#8E6BA8',
  '#C76B8A',
];

/** Quick overtime punches, in minutes — the "one tap" late-pickup buttons. */
export const OVERTIME_INCREMENTS = [15, 30, 60] as const;

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** The ratio timeline runs across a typical childminding day. */
export const TIMELINE_START_HOUR = 7;
export const TIMELINE_END_HOUR = 19;
