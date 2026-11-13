/**
 * The site-wide EmergencyBanner's decision, as pure functions so it can be tested: what (if
 * anything) the band says, and the signature that decides when the `role="alert"` region is
 * rewritten. The banner's client island does the fetching and the DOM; everything it decides
 * is here.
 *
 * In priority order: an evacuation, a wildfire, a PG&E Public Safety Power Shutoff at Warning
 * stage or under way (`pspsBannerEvent`), then a severe weather alert in effect now
 * (`weatherBannerEvent`: ACTIVE and SEVERE or EXTREME — never a Watch that hasn't started, never
 * an advisory). All four are read from area-scoped sources; the summary's region-wide severity
 * rollup is never trusted to put the band up, only to skip a fetch that can't matter.
 */
import {
  SEVERITY_RANK,
  pspsBannerEvent,
  weatherBannerEvent,
  type HazardFeature,
  type SummaryDomain,
} from './hazards';
import { formatPtDayTime } from './format';

export interface BannerInput {
  activeEvacuations: number | null | undefined;
  topEvents: { layer: string; headline: string }[];
  wildfire: { properties?: { headline?: string } }[];
  /** The banner-worthy PSPS (`pspsBannerEvent`), or null when there is none. */
  psps: HazardFeature | null;
  /** The banner-worthy weather alert (`weatherBannerEvent`), or null when there is none. */
  weather: HazardFeature | null;
}

export interface BannerState {
  active: boolean;
  label: string;
  headline: string;
  /**
   * Changes only when the hazard does. Rewriting a `role="alert"` region re-announces it, so a
   * PSPS signs on its id, stage, status and start — never on its headline, whose customer counts
   * PG&E revises through the day. A weather alert signs on what the band says (its name and
   * end time), not its id: NWS issues every update of the same warning under a new id.
   */
  sig: string;
}

/**
 * Is it worth fetching the power layer? The banner polls on every page, and the layer is
 * ~28 KB gzipped of mostly two-customer outage polygons. The summary's `power` domain already
 * carries the highest power severity, and a PSPS is never rated below MODERATE (a Watch is
 * MODERATE), so a confirmed domain topping out at INFO/MINOR is a known "no PSPS".
 *
 * `fetch` — read the layer; `none` — known no PSPS; `unknown` — The Grid can't say.
 */
export function powerCheck(domains: SummaryDomain[] | undefined): LayerCheck {
  return domainCheck(domains, 'power', 2);
}

/**
 * Is it worth fetching the weather_alert layer? Same reasoning as `powerCheck`: the layer
 * carries the alert polygons (~33 KB gzipped on a storm day), and the summary's `weather`
 * domain already has the highest weather severity, so a confirmed domain below SEVERE is a
 * known "nothing for the banner".
 */
export function weatherCheck(domains: SummaryDomain[] | undefined): LayerCheck {
  return domainCheck(domains, 'weather', 3);
}

export type LayerCheck = 'fetch' | 'none' | 'unknown';

function domainCheck(
  domains: SummaryDomain[] | undefined,
  domain: string,
  minRank: number
): LayerCheck {
  const d = domains?.find((x) => x.domain === domain);
  if (!d) return 'fetch';
  if (d.status === 'UNAVAILABLE') return 'unknown';
  return (SEVERITY_RANK[String(d.highestSeverity).toUpperCase()] ?? 0) >= minRank
    ? 'fetch'
    : 'none';
}

/** The banner-worthy PSPS from a fetched power layer, or `undefined` when it can't be read. */
export function pspsFromLayer(
  layer: { features?: HazardFeature[]; metadata?: { sourceStatus?: string } } | null
): HazardFeature | null | undefined {
  if (!layer || layer.metadata?.sourceStatus === 'UNAVAILABLE') return undefined;
  return pspsBannerEvent(layer.features ?? []);
}

/** The banner-worthy weather alert from a fetched layer, or `undefined` when it can't be read. */
export function weatherFromLayer(
  layer: { features?: HazardFeature[]; metadata?: { sourceStatus?: string } } | null,
  now: number
): HazardFeature | null | undefined {
  if (!layer || layer.metadata?.sourceStatus === 'UNAVAILABLE') return undefined;
  return weatherBannerEvent(layer.features ?? [], now);
}

/**
 * The NWS event name and when it ends, e.g. "Winter Storm Warning in effect until Sat 10:00
 * PT". The name is the alert's `weather.event` (its headline when that is missing), never the
 * forecast text, which is one click away on /live. `expires` is the hazard's end as NWS
 * issued it; without one the phrase stops at "in effect".
 */
function weatherHeadline(f: HazardFeature): string {
  const p = f.properties;
  const name = p.weather?.event || p.headline || 'Severe weather alert';
  const until = formatPtDayTime(p.expires);
  return until ? `${name} in effect until ${until}` : `${name} in effect`;
}

/**
 * A PSPS headline with no counts in it (see `sig`) — the counts and the full timeline are one
 * click away on /live. The start is PG&E's plan, so it's worded as one.
 */
function pspsHeadline(f: HazardFeature): string {
  if (String(f.properties.status ?? '').toUpperCase() === 'ACTIVE')
    return 'PG&E has shut off power in parts of the service area';
  const at = formatPtDayTime(f.properties.power?.deEnergizationStart);
  return at
    ? `PG&E plans to shut off power in parts of the service area from ${at}`
    : 'PG&E plans to shut off power in parts of the service area';
}

export function deriveBanner(input: BannerInput, now: number = Date.now()): BannerState {
  if ((input.activeEvacuations ?? 0) > 0) {
    const headline =
      input.topEvents.find((h) => h.layer === 'EVACUATION')?.headline ??
      'Active evacuation in the service area';
    return { active: true, label: 'Evacuation', headline, sig: `evac|${headline}` };
  }
  if (input.wildfire.length > 0) {
    const headline =
      input.wildfire[0]?.properties?.headline ?? 'Active wildfire near the foothills';
    return { active: true, label: 'Active Wildfire', headline, sig: `fire|${headline}` };
  }
  if (input.psps) {
    const p = input.psps.properties;
    return {
      active: true,
      label: 'Power Shutoff',
      headline: pspsHeadline(input.psps),
      sig: `psps|${p.id}|${p.power?.stage ?? ''}|${p.status ?? ''}|${p.power?.deEnergizationStart ?? ''}`,
    };
  }
  // Re-checked against `now`, not just when the layer was read: the island keeps the last
  // alert it saw through a failed poll, and that must not outlive the warning's own end.
  const wx = input.weather ? weatherBannerEvent([input.weather], now) : null;
  if (wx) {
    const headline = weatherHeadline(wx);
    return { active: true, label: 'Severe Weather', headline, sig: `wx|${headline}` };
  }
  return { active: false, label: '', headline: '', sig: 'none' };
}
