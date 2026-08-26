export type LastSeenUserSettings = {
  hideLastSeen?: boolean | null;
  hide_last_seen?: boolean | null;
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLastSeen(
  timestamp: string | Date | null | undefined,
  currentUserSettings?: LastSeenUserSettings | null,
  otherUserSettings?: LastSeenUserSettings | null,
): string | null {
  const currentUserHidden = Boolean(
    currentUserSettings?.hideLastSeen ?? currentUserSettings?.hide_last_seen,
  );
  const otherUserHidden = Boolean(
    otherUserSettings?.hideLastSeen ?? otherUserSettings?.hide_last_seen,
  );

  if (currentUserHidden) {
    return null;
  }

  if (!timestamp) return 'Offline';

  const date = toDate(timestamp);
  if (!date) return 'Offline';

  if (otherUserHidden) return 'Last seen recently';

  const diffMs = Date.now() - date.getTime();
  if (diffMs <= 60_000) return 'Just now';
  if (diffMs < 60 * 60_000) return `${Math.max(1, Math.round(diffMs / 60_000))}m ago`;
  if (diffMs < 24 * 60 * 60_000) return `${Math.max(1, Math.round(diffMs / (60 * 60_000)))}h ago`;

  const dayDiff = Math.floor(diffMs / (24 * 60 * 60_000));
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return `${dayDiff}d ago`;

  return 'Last seen recently';
}
