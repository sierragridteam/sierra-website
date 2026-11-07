// Run from the trusted default-branch checkout, before checking out any PR code.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const canWrite = (access) =>
  ['admin', 'maintain', 'write'].includes(access.role_name) ||
  ['admin', 'write'].includes(access.permission) ||
  access.user?.permissions?.push === true;

export function validateDeskPR({ repository, pr, commenterAccess, authorAccess, files }) {
  if (!canWrite(commenterAccess)) return null;
  if (pr.state !== 'open' || pr.base?.ref !== 'main') return null;
  if (pr.head?.repo?.full_name !== repository || pr.base?.repo?.full_name !== repository)
    return null;
  if (pr.user?.login !== 'github-actions[bot]' && !canWrite(authorAccess)) return null;
  const match = /^(news|fire)-desk\/[a-z0-9][a-z0-9-]*$/.exec(pr.head.ref);
  if (!match || !/^[a-f0-9]{40}$/.test(pr.head.sha)) return null;
  // Both desks publish one Markdown post. Reject executable code, prompts, assets,
  // deleted/renamed posts and unexpected paths instead of trusting a branch prefix.
  if (files.length !== 1 || files[0].mode !== '100644') return null;
  if (!/^src\/content\/blog\/[a-z0-9][a-z0-9-]*\.md$/.test(files[0].path)) return null;
  return { desk: match[1], head: pr.head.ref, sha: pr.head.sha, post: files[0].path };
}

function run() {
  const { GITHUB_REPOSITORY: repository, PR: number, COMMENT_AUTHOR: commenter } = process.env;
  if (!/^[0-9]+$/.test(number ?? '') || !repository || !commenter)
    throw new Error('Missing or invalid workflow context');
  const gh = (endpoint) => JSON.parse(execFileSync('gh', ['api', endpoint], { encoding: 'utf8' }));
  const access = (login) =>
    gh(`repos/${repository}/collaborators/${encodeURIComponent(login)}/permission`);
  const pr = gh(`repos/${repository}/pulls/${number}`);
  const commenterAccess = access(commenter);
  const authorAccess = pr.user?.login === 'github-actions[bot]' ? {} : access(pr.user.login);
  // Validate identity before fetching. GitHub API errors fail closed.
  const identity = validateDeskPR({
    repository,
    pr,
    commenterAccess,
    authorAccess,
    files: [{ path: 'src/content/blog/placeholder.md', mode: '100644' }],
  });
  let result = null;
  if (identity) {
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
    git('fetch', '--no-tags', 'origin', identity.sha);
    // Compare actual trees against trusted default-branch code, not just the PR's
    // merge-base diff. A stale PR must be refreshed before running privileged tools.
    const paths = git('diff', '--no-renames', '--name-only', '-z', 'HEAD', identity.sha)
      .split('\0')
      .filter(Boolean);
    const files = paths.map((path) => ({
      path,
      mode: git('ls-tree', identity.sha, '--', path).split(' ')[0],
    }));
    result = validateDeskPR({ repository, pr, commenterAccess, authorAccess, files });
  }
  const output = result
    ? `skip=false\ndesk=${result.desk}\nhead=${result.head}\nsha=${result.sha}\npost=${result.post}\n`
    : 'skip=true\n';
  appendFileSync(process.env.GITHUB_OUTPUT, output);
  console.log(
    result ? 'Approved a same-repository content-only desk PR.' : 'Desk PR not eligible.'
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
