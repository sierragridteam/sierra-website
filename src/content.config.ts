/**
 * Content collections. The blog is the site's "slow channel" — news, analysis,
 * preparedness, and explainers (see docs/news-feed-content-brief.md). Posts are
 * markdown files in src/content/blog/, named `yyyy-mm-dd-topic.md`; the filename
 * becomes the URL: /news/yyyy-mm-dd-topic.
 */
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    /** Plain, specific headline — sentence case, no colon-subtitle shapes. */
    title: z.string(),
    /** One-sentence summary, used in the feed listing + meta description. */
    description: z.string(),
    /** Publication date — must match the yyyy-mm-dd prefix of the filename. */
    pubDate: z.coerce.date(),
    /** Last-updated date for a live-updating post (a fire bulletin). When set and later
     *  than pubDate, the feed orders by it and PostMeta shows an "Updated" line. Must be
     *  >= pubDate. Normal posts omit it. */
    updatedDate: z.coerce.date().optional(),
    /** Feed "fold" head for a live bulletin: the current-status text the /news feed shows
     *  in place of the full body (the permalink still renders the whole timeline). Plain
     *  text. Posts without it render in full in the feed as before. */
    summary: z.string().optional(),
    /** One pillar tag, e.g. "Explainer", "Tech", "Preparedness", "Field Report",
     *  "Retrospective", "Fire Update" (an open, live wildfire bulletin), or
     *  "Announcement" (organizational news — only ever member-commissioned; see the
     *  news brief §4.6), or "Member Submission" (a member's signed guest post, copy-edited
     *  rather than rewritten — §4.7), or "Press Release" (the organization's own release,
     *  published as issued and added by a member, never drafted by a desk — its page closes
     *  with the standing About + media-contact block, and it is listed on /press). */
    tag: z.string().optional(),
    /** List this post on /press even though its tag is not a press tag — for organizational
     *  news filed another way (a founder's signed submission). `Press Release` and
     *  `Announcement` posts are listed without it. See src/lib/press.ts. */
    press: z.boolean().optional(),
    /** Byline. Omit for organizational posts; the automated desk sets its own. Also gates
     *  the standing colophon footnote (shown once per page for automated-desk posts). */
    author: z.string().optional(),
  }),
});

export const collections = { blog };
