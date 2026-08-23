import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { UserAvatar } from '@/components/ui/user-avatar';

describe('UserAvatar', () => {
  it('falls back to the bundled default avatar when no source is provided', () => {
    const markup = renderToStaticMarkup(<UserAvatar src={null} />);
    expect(markup).toContain('/src/assets/default-avatar.svg');
  });

  it('keeps the original avatar source when it is defined', () => {
    const markup = renderToStaticMarkup(<UserAvatar src="/api/storage/uploads/abc.png" />);
    expect(markup).toContain('/api/storage/uploads/abc.png');
  });
});
