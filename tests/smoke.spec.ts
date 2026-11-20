/**
 * Smoke tests: every page renders with the expected landmarks, a single H1, a
 * non-empty <title>, canonical link, and the global nav + footer.
 */
import { test, expect } from '@playwright/test';

const pages = [
  { name: 'home', path: '/', h1: /signal stays up/i },
  // The h1 is generated from the feed ("9 of 11 repeaters / heard in the last 12 hours."),
  // or states the failure honestly when the feed can't be reached — as in this suite.
  { name: 'mesh', path: '/mesh', h1: /repeaters|mesh/i },
  { name: 'news', path: '/news', h1: /news from the foothills/i },
  { name: 'news-archive', path: '/news/archive', h1: /archive/i },
  {
    name: 'news-post',
    path: '/news/2026-07-03-what-this-blog-is-for',
    h1: /what this blog is for/i,
  },
  // Generated from the alert stream once the feed lands ("3 alerts / for the foothills right
  // now."); "The Live Feed" before it does, and in CI's unreachable-feed state.
  { name: 'live', path: '/live', h1: /alerts|feeds|the live feed/i },
  { name: 'contact', path: '/contact', h1: /join the people who keep the signal up/i },
  { name: 'contact-thanks', path: '/contact/thanks', h1: /your message is on its way/i },
  { name: 'about', path: '/about', h1: /resilient communications/i },
  { name: 'partners', path: '/partners', h1: /organizations we build with/i },
  { name: 'press', path: '/press', h1: /releases, facts, and a contact/i },
  { name: 'about-jay', path: '/about/jay', h1: /jay l\. goldberg/i },
  { name: 'about-corrinne', path: '/about/corrinne', h1: /corrinne goldberg/i },
  { name: 'about-allan', path: '/about/allan', h1: /allan claghorn/i },
  { name: 'about-dan', path: '/about/dan', h1: /dan pupius/i },
  { name: 'donate', path: '/donate', h1: /help keep the foothills connected/i },
  { name: 'colophon', path: '/colophon', h1: /the signal desk — how it works/i },
];

for (const pg of pages) {
  test(`${pg.name} renders core structure`, async ({ page }) => {
    await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
    // /live gates body + footer behind a loader until the first fetch settles into ready
    // (ok) or failed (feed unreachable) — wait for that before asserting on the footer.
    if (pg.path === '/live') {
      await page
        .waitForSelector('html[data-live-boot="ready"], html[data-live-boot="failed"]', {
          timeout: 12000,
        })
        .catch(() => {});
    }

    await expect(page).toHaveTitle(/S\.I\.E\.R\.R\.A/);
    // SEO: Google truncates titles over ~60 chars, and <title> == og:title (Seo.astro),
    // so this also guards the social-card title (issue #5).
    expect((await page.title()).length).toBeLessThanOrEqual(60);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText(pg.h1);

    await expect(page.locator('header nav[aria-label="Primary"]')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('a.skip-link')).toHaveCount(1);

    // The full legal name must appear at least once (legal requirement).
    await expect(page.locator('body')).toContainText(
      'Signal Integrity & Emergency Radio Response Alliance'
    );
  });
}

// A word run straight into a link or a bold lead ("Emailinfo@sierragridteam.org"): Astro
// drops the whitespace between text and an inline element when the source breaks the line
// there, or when a bare space sits between an expression and an element in a named-slot
// Fragment. Nothing looks wrong in the source, so the served HTML is what gets checked.
const INLINE = '(?:a|strong|em|b|i|code|abbr|cite)';
const GLUED_BEFORE = new RegExp(`[^<>]{0,40}[A-Za-z0-9,;:.?!]<${INLINE}[\\s>][^<]{0,40}`, 'g');
const GLUED_AFTER = new RegExp(`[^<>]{0,40}</${INLINE}>[A-Za-z0-9][^<]{0,40}`, 'g');

for (const pg of pages) {
  test(`${pg.name} runs no text into an inline element`, async ({ request }) => {
    const res = await request.get(pg.path);
    expect(res.ok()).toBeTruthy();
    // Script and style bodies are not prose. Removed until nothing is left to remove, so a
    // block nested in another's text cannot leave a tag behind.
    let html = await res.text();
    for (let before = ''; before !== html;) {
      before = html;
      html = html.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '');
    }
    expect([...(html.match(GLUED_BEFORE) ?? []), ...(html.match(GLUED_AFTER) ?? [])]).toEqual([]);
  });
}

test('the contact pages keep the space before the email address', async ({ page }) => {
  await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cform__fallback')).toHaveText(
    'Prefer to write directly? Email info@sierragridteam.org.'
  );
  await page.goto('/contact/thanks', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.page-head__lede')).toContainText(
    'email us directly at info@sierragridteam.org.'
  );
  await page.goto('/about/jay', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.profile__para', { hasText: 'Executive Operations' })).toContainText(
    'Executive Operations: Jay'
  );
});

test('rss feed is valid and lists posts', async ({ request }) => {
  const res = await request.get('/rss.xml');
  expect(res.ok()).toBeTruthy();
  expect(res.headers()['content-type']).toContain('xml');
  const body = await res.text();
  expect(body).toContain('<rss');
  expect(body).toContain('<channel>');
  // A known post surfaces with an absolute permalink (item links are absolutized).
  expect(body).toContain('<title>What this blog is for</title>');
  expect(body).toContain('https://sierragridteam.org/news/2026-07-03-what-this-blog-is-for');
});

// /blog became /news; the old addresses (section, archive, every post) still land.
for (const [from, to] of [
  ['/blog', '/news'],
  ['/blog/archive', '/news/archive'],
  ['/blog/2026-07-03-what-this-blog-is-for', '/news/2026-07-03-what-this-blog-is-for'],
]) {
  test(`${from} redirects to ${to}`, async ({ page }) => {
    await page.goto(from, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(`**${to}`);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

test('/press lists organizational releases and announcements', async ({ page }) => {
  await page.goto('/press', { waitUntil: 'domcontentloaded' });
  const releases = page.locator('section[aria-labelledby="releases-title"]');
  // Organizational news is listed; an ordinary desk post is not.
  await expect(releases).toContainText('S.I.E.R.R.A and Utica partner in Murphys');
  await expect(releases).toContainText('S.I.E.R.R.A receives critical Calaveras grant');
  await expect(releases).toContainText('S.I.E.R.R.A Applies for Calaveras Grant');
  // The desk's write-up of the grant opts out (press: false): the release itself is listed.
  await expect(releases).not.toContainText('S.I.E.R.R.A awarded Calaveras foundation grant');
  await expect(releases).not.toContainText('How to read a Red Flag Warning');
  await expect(page.locator('footer a[href="/press"]')).toHaveCount(1);
});

test('a press release shows its full headline and the standing close', async ({ page }) => {
  await page.goto('/news/2026-11-15-utica-repeater-partnership', { waitUntil: 'domcontentloaded' });
  // The h1 is the headline as issued; the short `title` carries the page title.
  await expect(page.locator('h1')).toContainText(/Utica Water and Power Authority Partner/);
  expect((await page.title()).length).toBeLessThanOrEqual(60);
  const foot = page.locator('.press-foot');
  await expect(foot).toContainText('About S.I.E.R.R.A');
  await expect(foot).toContainText('Media Contact');
  await expect(foot.locator('a[href="/press"]')).toHaveCount(1);
});

test('404 page returns on-brand not-found content', async ({ page }) => {
  const res = await page.goto('/this-route-does-not-exist', { waitUntil: 'domcontentloaded' });
  // Static hosts serve 404.html; status may be 404 or 200 depending on host.
  expect(res).toBeTruthy();
  await expect(page.locator('h1')).toContainText(/off the grid/i);
});

// A refused request (a POST to the static site) is answered with /403.html. It was once a
// copy of the 404 page and told a reader whose request was refused that the page was missing.
test('403 page says the request was refused, not that the page is missing', async ({ page }) => {
  const res = await page.goto('/403.html', { waitUntil: 'domcontentloaded' });
  expect(res?.ok()).toBeTruthy();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText(/did not go through/i);
  await expect(page.locator('body')).not.toContainText(/off the grid|could not be found/i);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('.kicker')).toContainText('403');
});
