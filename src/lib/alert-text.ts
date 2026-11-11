/**
 * alert-text.ts — render NWS CAP alert text (`description`) as HTML-safe blocks.
 *
 * NWS text is teletype-wrapped at ~70 columns: a single `\n` is a wrap, not a break,
 * `\n\n` separates paragraphs, and sections lead with `* WHAT...`, `* WHERE...`, etc.
 * The Grid serves the text verbatim, so unwrapping is the website's job. Pure (no DOM).
 * Only for NWS alert text — Caltrans/CHP descriptions follow other conventions.
 */
import { escapeHtml as esc } from './format';

const LABEL = /^\*\s*([A-Z][A-Z0-9 /&'-]*?)\s*\.\.\.\s*([\s\S]*)$/;
const BULLET = /^[-*]\s+(.*)$/;

const unwrap = (lines: string[]): string => lines.join(' ').replace(/\s+/g, ' ').trim();

/** One blank-line-separated paragraph (already split into trimmed, non-empty lines) → HTML. */
function renderParagraph(lines: string[]): string {
  const labelled = LABEL.exec(lines.join('\n'));
  if (labelled) {
    const body = unwrap([labelled[2]]);
    return (
      `<p class="stream__desc"><strong class="stream__desc-label">${esc(labelled[1])}</strong>` +
      (body ? ` ${esc(body)}` : '') +
      `</p>`
    );
  }
  // Plain text, possibly with `-`/`*` bullets (wrapped bullets continue on the next line).
  const out: string[] = [];
  let intro: string[] = [];
  let items: string[][] = [];
  const flushIntro = () => {
    if (intro.length) out.push(`<p class="stream__desc">${esc(unwrap(intro))}</p>`);
    intro = [];
  };
  const flushItems = () => {
    if (items.length) {
      out.push(
        `<ul class="stream__desc-list">${items.map((i) => `<li>${esc(unwrap(i))}</li>`).join('')}</ul>`
      );
    }
    items = [];
  };
  for (const line of lines) {
    const b = BULLET.exec(line);
    if (b) {
      flushIntro();
      items.push([b[1]]);
    } else if (items.length) {
      items[items.length - 1].push(line);
    } else {
      intro.push(line);
    }
  }
  flushIntro();
  flushItems();
  return out.join('');
}

/** NWS-style text → HTML blocks (`<p>`/`<ul>`), fully escaped. Null/blank → ''. */
export function formatAlertBody(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((para) =>
      para
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0)
    .map(renderParagraph)
    .join('');
}
