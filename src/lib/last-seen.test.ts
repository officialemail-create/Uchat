import { describe, it, expect } from 'vitest';
import { formatLastSeen } from './last-seen';

describe('formatLastSeen', () => {
  it('hides exact times when current user privacy is enabled', () => {
    expect(formatLastSeen(new Date(Date.now() - 5 * 60 * 1000).toISOString(), { hideLastSeen: true }, { hideLastSeen: false })).toBeNull();
  });

  it('returns a generic value when the other user hides their status', () => {
    expect(formatLastSeen(new Date(Date.now() - 5 * 60 * 1000).toISOString(), { hideLastSeen: false }, { hideLastSeen: true })).toBe('Last seen recently');
  });

  it('returns a relative time when both users allow it', () => {
    expect(formatLastSeen(new Date(Date.now() - 5 * 60 * 1000).toISOString(), { hideLastSeen: false }, { hideLastSeen: false })).toBe('5m ago');
  });

  it('returns offline when the timestamp is missing', () => {
    expect(formatLastSeen(null, { hideLastSeen: false }, { hideLastSeen: false })).toBe('Offline');
  });
});
