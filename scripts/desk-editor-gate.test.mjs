import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateDeskPR } from './desk-editor-gate.mjs';

const fixture = () => ({
  repository: 'sierragridteam/sierra-website',
  pr: {
    state: 'open',
    base: { ref: 'main', repo: { full_name: 'sierragridteam/sierra-website' } },
    head: {
      ref: 'news-desk/test-post',
      sha: 'a'.repeat(40),
      repo: { full_name: 'sierragridteam/sierra-website' },
    },
    user: { login: 'github-actions[bot]' },
  },
  commenterAccess: { permission: 'write' },
  authorAccess: {},
  files: [{ path: 'src/content/blog/2026-11-07-test-post.md', mode: '100644' }],
});

test('accepts a content-only desk PR and retains the exact reviewed commit', () => {
  const input = fixture();
  assert.deepEqual(validateDeskPR(input), {
    desk: 'news',
    head: input.pr.head.ref,
    sha: input.pr.head.sha,
    post: input.files[0].path,
  });
  input.pr.head.ref = 'fire-desk/test-fire-1234';
  input.pr.user.login = 'editor';
  input.authorAccess = { role_name: 'maintain' };
  assert.equal(validateDeskPR(input).desk, 'fire');
});

for (const [name, mutate] of [
  ['fork with a matching branch name', (x) => (x.pr.head.repo.full_name = 'outsider/fork')],
  ['organization member without write access', (x) => (x.commenterAccess = { permission: 'read' })],
  ['untrusted PR author', (x) => (x.pr.user.login = 'outsider')],
  ['closed PR', (x) => (x.pr.state = 'closed')],
  ['unexpected base branch', (x) => (x.pr.base.ref = 'other')],
  ['missing head repository', (x) => (x.pr.head.repo = null)],
  ['unsafe branch name', (x) => (x.pr.head.ref = 'news-desk/test\npost=evil')],
  ['invalid commit SHA', (x) => (x.pr.head.sha = '--help')],
  ['symlink post', (x) => (x.files[0].mode = '120000')],
  ['deleted post', (x) => (x.files[0].mode = '')],
  ['workflow change', (x) => (x.files[0].path = '.github/workflows/deploy.yml')],
  [
    'dependency change alongside post',
    (x) => x.files.push({ path: 'package.json', mode: '100644' }),
  ],
  ['path traversal', (x) => (x.files[0].path = 'src/content/blog/../../scripts/evil.md')],
  ['no changes', (x) => (x.files = [])],
]) {
  test(`rejects ${name}`, () => {
    const input = fixture();
    mutate(input);
    assert.equal(validateDeskPR(input), null);
  });
}
