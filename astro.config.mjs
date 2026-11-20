// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { renameSync, rmdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// CloudFront answers a refused request (a POST to the static site, for example) with
// /403.html, and a missing page with /404.html. Astro writes 404.astro to /404.html but
// any other page to a directory, so move /403/index.html to /403.html after the build.
/** @type {import('astro').AstroIntegration} */
const emit403 = {
  name: 'emit-403',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const out = fileURLToPath(dir);
      renameSync(`${out}403/index.html`, `${out}403.html`);
      rmdirSync(`${out}403`);
    },
  },
};

// The canonical production origin. DNS is managed via Hostinger; the static
// output is deployed to AWS S3 + CloudFront. See docs/deployment.md.
const SITE = 'https://sierragridteam.org';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // Fully static output — no server adapter. Every page is pre-rendered to HTML
  // at build time; small islands hydrate client-side for the live clock and live data
  // (fetched from data.sierragridteam.org in the browser — no feed data is baked in).
  // See docs/architecture/data-feed.md.
  output: 'static',
  trailingSlash: 'never',
  // /alerts was folded into the flagship /live situation page. Astro emits a static
  // redirect (meta-refresh + canonical); a true 301 can also be set at CloudFront.
  // /blog was renamed /news (2026-11): the section, its archive and every post moved, and
  // the old addresses redirect the same way. The posts still live in src/content/blog/.
  redirects: {
    '/alerts': '/live',
    '/blog': '/news',
    '/blog/archive': '/news/archive',
    '/blog/[slug]': '/news/[slug]',
  },
  build: {
    // Directory output: /mesh -> mesh/index.html (Astro's default, matches the other
    // sites + standard S3/CloudFront hosting). A CloudFront viewer-request function maps
    // the clean URL /mesh -> /mesh/index.html — see docs/deployment.md.
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  integrations: [
    sitemap({
      // Keep the sitemap honest: only real, indexable pages.
      filter: (page) => !page.includes('/404') && !page.includes('/403'),
    }),
    emit403,
  ],
  // DEV-ONLY same-origin proxy to The Grid.
  //
  // The feed's CORS allowlist names the production origin and `http://localhost:4321`. Any
  // other dev origin — a container port mapping, a LAN IP, a tunnel/`--host` hostname — is
  // rejected by the browser before the response is read, so every live region on /live and
  // /mesh fails. Proxying through the dev server makes the requests same-origin, so CORS
  // stops applying at all and dev works from any hostname.
  //
  // This exists ONLY in `astro dev`. The production build and `astro preview` are untouched
  // and still hit https://data.sierragridteam.org directly — see GRID_API_BASE in
  // src/lib/grid.ts, which selects this path on `import.meta.env.DEV`. Nothing is fetched at
  // build time either way (docs/architecture/data-feed.md).
  vite: {
    server: {
      proxy: {
        '/grid-api': {
          target: 'https://data.sierragridteam.org',
          changeOrigin: true, // send the upstream's Host — needed for TLS SNI + vhost routing
          rewrite: (p) => p.replace(/^\/grid-api/, '/api/v1'),
        },
      },
    },
  },
  // Deterministic, dependency-light builds: no telemetry, predictable asset names.
  devToolbar: { enabled: false },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
});
