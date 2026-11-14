/**
 * partners.ts — organizations S.I.E.R.R.A works with. One list drives two places: the
 * /partners page (each entry in full) and the homepage Supporters band (logos only).
 *
 * Edit this file to add or remove a partner; neither the page nor the band needs touching.
 * A partner with no `logo` yet is listed on /partners as text and left out of the band.
 * The band is headed "Supporters" and ends on a link to /donate, so a partner that should
 * not be read as a donor or sponsor sets `supportersBand: false` and stays on /partners only.
 * Layout lives in `src/components/PartnerCard.astro` and `src/components/home/Supporters.astro`.
 *
 * ⚠️ **Only list an organization once the relationship is real and they have agreed to be
 * named.** Both places are a public claim about someone else's business, and a logo on a
 * nonprofit's site reads as an endorsement in both directions. Describe the partnership
 * only in terms we can stand behind — if we do not know whether it was hardware, money or
 * time, say nothing about which rather than guessing (docs/content-style-guide.md §3).
 *
 * Logos are the organization's OWN mark, used as supplied, and are deliberately not
 * recolored to the palette: a partner's brand is theirs, not ours to restyle. They are the
 * one sanctioned place on the site where non-palette color appears in an image.
 */
import type { ImageMetadata } from 'astro';
import heltecLogo from '../assets/partners/heltec-automation.png';
import ersnLogo from '../assets/partners/ersn.webp';
import uticaLogo from '../assets/partners/utica-water-and-power-authority.webp';

export interface Partner {
  /** Legal/product name, exactly as the organization writes it. */
  name: string;
  /**
   * What kind of partner they are, in Title Case — rendered as the small uppercase label
   * above the name (e.g. "Technology Partner", "Tower Partner", "Cooperating Agency").
   */
  category: string;
  /**
   * The /partners write-up. Agreed with the partner: keep it to what they do and what they
   * provide, and fix only canonical spellings (S.I.E.R.R.A, place and agency names).
   */
  description: string;
  /**
   * Optional: leave it out until the partner supplies their mark — never substitute one
   * lifted from their site. Without it the /partners card is text only and the homepage
   * band skips the entry.
   */
  logo?: ImageMetadata;
  /** Alt text, required with `logo`. The logo IS the content, so the alt names the organization. */
  logoAlt?: string;
  /**
   * Set to `false` to keep a partner with a logo out of the homepage Supporters band. That
   * band reads as "who backs us" beside a Donate link; a partner whose relationship is not
   * of that kind belongs on /partners only. Defaults to shown.
   */
  supportersBand?: boolean;
  /** Their own site. Opens in a new tab, `rel="noopener external"`. */
  url: string;
}

export const partners: readonly Partner[] = [
  {
    name: 'Heltec Automation',
    category: 'Technology Partner',
    // Copy provided by Jay Goldberg (2026-10); only the S.I.E.R.R.A spelling and the dash
    // spacing are changed to house style.
    description:
      'Heltec Automation is a technology company specializing in smart, low-power IoT ' +
      'hardware, long-range LoRa wireless communication devices, and developer tools. In ' +
      'partnership with S.I.E.R.R.A (Signal Integrity & Emergency Radio Response Alliance), ' +
      'Heltec provides robust, off-grid radio hardware — such as solar-compatible LoRa nodes, ' +
      'compact tracking devices, and developer boards — that serves as the technical backbone ' +
      'for the Calaveras County Mesh efforts.',
    logo: heltecLogo,
    logoAlt: 'Heltec Automation',
    url: 'https://heltec.org/',
  },
  {
    // The authority's full name, as uticawater.com writes it.
    name: 'Utica Water and Power Authority',
    category: 'Site Partner',
    // The first sentence is drawn from uticawater.com's own description (2026-11). The
    // partnership is as S.I.E.R.R.A states it: access for siting repeaters, not funding —
    // do not describe Utica as a donor or sponsor.
    description:
      'Utica Water and Power Authority is a nonprofit joint powers authority that supplies ' +
      'water to Murphys and Angels Camp. Utica has opened 27 miles of its watershed area to ' +
      'S.I.E.R.R.A for repeater placement.',
    // Utica's shield badge only, cropped from the horizontal lockup S.I.E.R.R.A's board
    // supplied (2026-11): the wordmark beside it is dropped because the name is set in text
    // next to the logo, and the wide lockup left the shield too small to read. The crop is
    // at the source's own resolution; the badge itself is not redrawn or recolored.
    logo: uticaLogo,
    logoAlt: 'Utica Water and Power Authority',
    // Not a financial supporter: under "Supporters" and a Donate link the logo would say
    // otherwise. Remove this line if that changes.
    supportersBand: false,
    url: 'https://www.uticawater.com/',
  },
  {
    // Listed last by request (2026-11); the order here is the order on /partners and in the
    // homepage band.
    // ERSN's site writes the name both with and without the apostrophe; its title, sidebar
    // and footer agree on none.
    name: 'Ebbetts Radio Safety Net',
    category: 'Community Partner',
    // The first sentence is drawn from ersn.net's own description (2026-10). The partnership
    // itself — S.I.E.R.R.A helping manage ERSN's repeaters and feeding data to ersn.net — is
    // as S.I.E.R.R.A states it. Keep it short: it should not outgrow the Heltec entry.
    description:
      'The Ebbetts Radio Safety Net (ERSN) is a volunteer organization that has provided ' +
      'emergency communications to Arnold and Murphys since 2024, through weekly practice ' +
      'nets and two General Mobile Radio Service (GMRS) repeaters on the Highway 4 corridor. ' +
      'S.I.E.R.R.A grew out of ERSN, helps manage those repeaters, and provides data feeds ' +
      'used on ersn.net.',
    logo: ersnLogo,
    logoAlt: 'Ebbetts Radio Safety Net (ERSN)',
    url: 'https://ersn.net/',
  },
];
