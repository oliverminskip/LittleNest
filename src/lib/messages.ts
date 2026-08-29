import type { Role } from '@/types';

/**
 * The legacy single-file app wrote the childminder's messages as
 * `from: 'fran'` rather than `from: 'minder'` (see `legacy/index.html:764`).
 *
 * Every message sent before this rebuild carries that value, so reads have to
 * normalise it — otherwise a setting's entire message history renders as if
 * the parent had sent both sides of the conversation.
 *
 * New writes always use the role names; this is a read-side shim for existing
 * data plus the window where the old GitHub Pages build is still live.
 */
export const LEGACY_MINDER_SENDER = 'fran';

/** Anything that isn't explicitly the parent is the childminder. */
export function senderRole(from: string | undefined): Role {
  return from === 'parent' ? 'parent' : 'minder';
}

export const isFromRole = (from: string | undefined, role: Role): boolean =>
  senderRole(from) === role;
