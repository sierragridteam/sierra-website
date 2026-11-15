import { describe, expect, test } from 'bun:test';
import { isPressItem, isPressRelease } from './press';

describe('press', () => {
  test('only the Press Release tag is a release', () => {
    expect(isPressRelease({ tag: 'Press Release' })).toBe(true);
    expect(isPressRelease({ tag: 'Announcement' })).toBe(false);
    expect(isPressRelease({ tag: 'Member Submission', press: true })).toBe(false);
    expect(isPressRelease({})).toBe(false);
  });

  test('/press lists releases, announcements, and posts that opt in', () => {
    expect(isPressItem({ tag: 'Press Release' })).toBe(true);
    expect(isPressItem({ tag: 'Announcement' })).toBe(true);
    expect(isPressItem({ tag: 'Member Submission', press: true })).toBe(true);
  });

  test('everything else stays off /press', () => {
    expect(isPressItem({ tag: 'Member Submission' })).toBe(false);
    expect(isPressItem({ tag: 'Explainer' })).toBe(false);
    expect(isPressItem({ tag: 'Explainer', press: false })).toBe(false);
    expect(isPressItem({})).toBe(false);
  });

  test('press: false takes a press-tagged post off /press', () => {
    expect(isPressItem({ tag: 'Announcement', press: false })).toBe(false);
    expect(isPressItem({ tag: 'Press Release', press: false })).toBe(false);
  });
});
