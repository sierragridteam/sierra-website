/**
 * The Grid (data.sierragridteam.org) hazard-aggregation client + types + derivations.
 *
 * The hazard API (CHANGELOG 2026-06-26/27) normalizes wildfire, evacuation, weather,
 * seismic, road, and scanner data into one RFC 7946 GeoJSON model with a common
 * `properties` envelope + a comparable INFO..EXTREME severity scale. These are PURE types
 * + derivations — no build-time fetch (the browser fetches live and feeds the snapshot in).
 *
 * The Grid is now authoritative and place-scoped server-side: every `/places/{area}/map/*`
 * layer is clipped to the ebbetts-pass polygon at ingest (road_incident and weather_alert
 * included, using the same point-in-polygon test as `/places:resolve`), so the client no
 * longer re-filters by service-area bounds or NWS zones — it renders what the place feed
 * returns. We still recompute the honest per-layer counts locally (sourceStatus → null).
 */

/**
 * Hazard-aggregation area slug (configured server-side in prefab.yaml). Renamed
 * `calaveras` → `ebbetts-pass` on 2026-07-06 (the corridor spans Calaveras + Tuolumne,
 * so the old county-name slug was a misnomer); the old slug now 404s.
 */
export const HAZARD_AREA = 'ebbetts-pass';

// ---- GeoJSON types (RFC 7946 + the common properties envelope) ----

export type Severity = 'INFO' | 'MINOR' | 'MODERATE' | 'SEVERE' | 'EXTREME';

export interface HazardSource {
  id: string;
  name: string;
  attribution?: string;
}

/**
 * Per-event provenance. `sourceUrl` is the authoritative page for THIS specific event —
 * the CAL FIRE incident page for a wildfire, the Genasys zone viewer for an evacuation.
 * It is **optional per source** (CAL FIRE / Genasys emit it; CHP road incidents don't), so
 * only render the "More information" link when it's present. (Distinct from a layer's
 * `metadata.sourceUrl`, which is the whole feed's home page, not one incident.)
 */
export interface HazardProvenance {
  sourceUrl?: string;
}

/** Common envelope on every hazard feature + the typed per-kind blocks. */
export interface HazardProps {
  id: string;
  layer: string;
  kind: string;
  category?: string;
  severity: Severity | string;
  severityRank: number;
  headline: string;
  status?: string;
  description?: string;
  effective?: string | null;
  expires?: string | null;
  updatedAt?: string | null;
  areaLabel?: string;
  source: HazardSource;
  provenance?: HazardProvenance;
  incident?: { logNumber?: string };
  weather?: { event?: string; source?: string; zones?: string[] };
  fireWeather?: { state?: string };
  road?: {
    roadId?: string;
    congestion?: string;
    delayMinutes?: number;
    durationMinutes?: number;
    distanceKm?: number;
  };
  earthquake?: { magnitude?: number; depthKm?: number; felt?: number | null };
  wildfire?: { acres?: number; containment?: number; county?: string; hasPerimeter?: boolean };
  evacuation?: { zoneId?: string; level?: string; eventType?: string; county?: string };
  /**
   * PG&E outages (`category` unplanned | planned) and Public Safety Power Shutoffs
   * (`category` psps, which add the stage + de-energization window). `estimatedRestoration`,
   * `deEnergizationEnd` and `allClear` are PG&E ESTIMATES that PG&E routinely overruns — The
   * Grid deliberately keeps them off `expires`, and we only ever show them labelled as
   * estimates, never use them to hide or close an event.
   */
  power?: {
    outageId?: string;
    cause?: string;
    customersAffected?: number;
    crewStatus?: string;
    estimatedRestoration?: string;
    eventName?: string;
    stage?: string; // Watch | Warning
    medicalBaselineAffected?: number;
    deEnergizationStart?: string;
    deEnergizationEnd?: string;
    allClear?: string;
  };
  [key: string]: unknown;
}

export interface HazardGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon' | 'MultiLineString';
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface HazardFeature {
  type: 'Feature';
  geometry: HazardGeometry | null;
  properties: HazardProps;
}

export interface HazardLayer {
  type: 'FeatureCollection';
  features: HazardFeature[];
  metadata: {
    layer: string;
    area: string;
    generatedAt: string;
    sourceStatus: 'OK' | 'STALE' | 'UNAVAILABLE';
    schemaVersion?: number;
    attribution?: string;
    sourceUrl?: string;
    lastSourceUpdate?: string;
  };
}

/** One event line in a place summary's `topEvents`. */
export interface SummaryEvent {
  id: string;
  layer: string;
  severity: string;
  severityRank: number;
  headline: string;
  source: string;
}

/** One hazard-domain rollup in a place summary (fire, evacuation, weather, roads, seismic). */
export interface SummaryDomain {
  domain: string;
  status: 'OK' | 'STALE' | 'UNAVAILABLE' | string;
  highestSeverity: Severity | string;
  activeCount: number;
  headlines: Array<{ id: string; severity: string; headline: string }>;
}

/**
 * `/places/{area}/summary` — the authoritative place rollup. We use it for the "Synced …"
 * timestamp and the fail-loud `activeEvacuations` (int | null); the per-layer counts we
 * still recompute locally from the map layers (deriveSituationSummary) so the tiles and the
 * stream stay in lockstep. For the life-safety wildfire signal, EmergencyBanner reads the
 * `wildfire` map layer directly (authoritative + place-scoped) rather than the `domains`
 * rollup.
 */
export interface PlaceSummary {
  place: string;
  placeId: string;
  placeName: string;
  generatedAt: string;
  mode: string;
  summary: {
    highestSeverity: Severity | string;
    highestSeverityRank: number;
    severityCounts: Record<string, number>;
    totalActive: number;
    activeEvacuations: number | null;
    evacuationStatus: 'OK' | 'STALE' | 'UNAVAILABLE' | string;
    topEvents: SummaryEvent[];
  };
  domains: SummaryDomain[];
}

export interface Scanner {
  feedId: string;
  channelLabel: string;
  agency: string;
  broadcastifyUrl: string;
}

export interface HazardsSnapshot {
  fetchedAt: string;
  area: string;
  summary: PlaceSummary | null;
  layers: Record<string, HazardLayer | null>;
  scanners: Scanner[] | null;
}

/** Layers that feed the prioritized alert stream (road_segment is the road table). */
export const STREAM_LAYERS = [
  'evacuation',
  'wildfire',
  'weather_alert',
  'fire_weather',
  'road_incident',
  'chain_control',
  'earthquake',
  'power',
] as const;

// ---- Severity ----

export const SEVERITY_RANK: Record<string, number> = {
  INFO: 0,
  MINOR: 1,
  MODERATE: 2,
  SEVERE: 3,
  EXTREME: 4,
};

export function rankOf(f: HazardFeature): number {
  if (typeof f.properties.severityRank === 'number') return f.properties.severityRank;
  return SEVERITY_RANK[String(f.properties.severity).toUpperCase()] ?? 0;
}

/**
 * An alert that has been ISSUED but whose hazard window hasn't opened yet.
 *
 * The Grid used to read CAP's `effective`/`expires` — the *product's* issuance time and the
 * office's re-issue deadline — so a watch written on Tuesday for Thursday's storms went
 * straight to ACTIVE the moment it was written. Since 2026-08-11 it reads `onset`/`ends`
 * (the *hazard's* window) instead, and `status` is SCHEDULED until onset, which is what the
 * field was always specified to mean. Treating that as active would say the weather is on
 * us when it isn't; dropping it would hide an issued warning. We count and label both.
 *
 * **`status` is the authority.** The Grid computes it against CAP's onset and the 2026-08-11
 * changelog points consumers at it; we read it and trust it, including when it disagrees
 * with the timestamps.
 *
 * **The onset is graceful degradation, not the working path.** The `.geojson` map layers —
 * which is what /live reads — omitted `status` on `weather_alert` while `/events` carried
 * it, so keying on `status` alone made the page read "1 Active" for a Red Flag Warning six
 * hours out (found live 2026-08-13, fixed upstream). If the field goes missing again, on
 * this layer or a new one, we compare `effective` — which is on every surface and, since
 * 2026-08-11, means the hazard's start — rather than silently calling the alert in force.
 * A record carrying neither counts as in force: we can't assert it hasn't started.
 */
export function isScheduled(f: HazardFeature, now: number): boolean {
  const status = String(f.properties.status ?? '').toUpperCase();
  if (status) return status === 'SCHEDULED';
  const onset = Date.parse(String(f.properties.effective ?? ''));
  return Number.isFinite(onset) && onset > now;
}

export type Tone = 'alarm' | 'elevated' | 'ok' | 'muted';

/** Severity → design tone. Orange (alarm) reserved for SEVERE/EXTREME risk only. */
export function toneForRank(rank: number): Tone {
  if (rank >= 3) return 'alarm';
  if (rank === 2) return 'elevated';
  return 'ok';
}
export const toneFor = (f: HazardFeature): Tone => toneForRank(rankOf(f));

/** "SEVERE" → "Severe" for display. */
export const severityLabel = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

// ---- Layer access ----

/**
 * Features for a single layer. The Grid place feed is already clipped to the ebbetts-pass
 * polygon server-side (road_incident and weather_alert included), so there is no client
 * re-filtering — we render exactly what the place feed returns.
 */
export function layerFeatures(snapshot: HazardsSnapshot, layer: string): HazardFeature[] {
  return snapshot.layers?.[layer]?.features ?? [];
}

// ---- Derivations ----

/**
 * Power features worth a reader's attention. The statewide median outage affects ONE
 * customer, so most of the layer is INFO — a dozen "Planned outage — 2 customers" cards would
 * bury the one PSPS that matters. The Grid drops INFO power from its own place rollup for the
 * same reason; we match it, on the stream and the map alike.
 */
export const isNotablePower = (f: HazardFeature): boolean => rankOf(f) > 0;

/**
 * The PSPS that warrants the site-wide banner, or null. A **Warning** (PG&E expects to cut
 * power, typically within a day) or any shutoff whose de-energization window has opened
 * (`status` ACTIVE — The Grid keeps it SCHEDULED until then). A Watch that hasn't started stays
 * in the /live stream only. Stage is compared case-insensitively: it arrives as a string.
 *
 * Deterministic when several qualify — under way first, then Warning, then by id — so feed
 * order can't flip which one the banner names (and re-announce it) between polls.
 */
export function pspsBannerEvent(features: HazardFeature[]): HazardFeature | null {
  const live = (f: HazardFeature) => String(f.properties.status ?? '').toUpperCase() === 'ACTIVE';
  const warning = (f: HazardFeature) =>
    String(f.properties.power?.stage ?? '').toUpperCase() === 'WARNING';
  const hits = features.filter((f) => f.properties.category === 'psps' && (live(f) || warning(f)));
  hits.sort(
    (a, b) =>
      Number(live(b)) - Number(live(a)) ||
      Number(warning(b)) - Number(warning(a)) ||
      String(a.properties.id).localeCompare(String(b.properties.id))
  );
  return hits[0] ?? null;
}

/**
 * The weather alert that warrants the site-wide banner, or null: an NWS alert **in effect now**
 * (`status` ACTIVE) rated SEVERE or EXTREME — a Winter Storm Warning under way, not the Watch
 * issued two days ahead (SCHEDULED, see `isScheduled`) and not an advisory (MODERATE or lower).
 * Both stay on /live. An alert whose `expires` has passed is dropped even if the feed still
 * lists it, so a cached layer can't hold the band up after the warning ends.
 *
 * `status` is the authority, as in `isScheduled`; a record with no status at all falls back to
 * its onset. Any other status (ended, cancelled) is not "in effect".
 *
 * Deterministic when several qualify — highest severity, then the one that ends last, then by
 * id — so feed order can't flip which one the banner names between polls.
 */
export function weatherBannerEvent(features: HazardFeature[], now: number): HazardFeature | null {
  const ends = (f: HazardFeature) => Date.parse(String(f.properties.expires ?? ''));
  const inEffect = (f: HazardFeature) => {
    const status = String(f.properties.status ?? '').toUpperCase();
    if (status ? status !== 'ACTIVE' : isScheduled(f, now)) return false;
    const end = ends(f);
    return !(Number.isFinite(end) && end <= now);
  };
  const hits = features.filter(
    (f) =>
      String(f.properties.layer ?? '').toUpperCase() === 'WEATHER_ALERT' &&
      rankOf(f) >= SEVERITY_RANK.SEVERE &&
      inEffect(f)
  );
  hits.sort(
    (a, b) =>
      rankOf(b) - rankOf(a) ||
      (ends(b) || Infinity) - (ends(a) || Infinity) ||
      String(a.properties.id).localeCompare(String(b.properties.id))
  );
  return hits[0] ?? null;
}

/**
 * The prioritized alert stream: every relevant active hazard, most-urgent first.
 * Excludes road segments (that's the road-conditions table), a "normal"
 * fire-weather banner (INFO — not an alert) and INFO power outages (isNotablePower).
 */
export function deriveStream(snapshot: HazardsSnapshot): HazardFeature[] {
  const out: HazardFeature[] = [];
  for (const layer of STREAM_LAYERS) {
    for (const f of layerFeatures(snapshot, layer)) {
      if (layer === 'fire_weather' && rankOf(f) === 0) continue; // hide "normal"
      if (layer === 'power' && !isNotablePower(f)) continue;
      out.push(f);
    }
  }
  return out.sort((a, b) => {
    const dr = rankOf(b) - rankOf(a);
    if (dr !== 0) return dr;
    return String(b.properties.updatedAt ?? b.properties.effective ?? '').localeCompare(
      String(a.properties.updatedAt ?? a.properties.effective ?? '')
    );
  });
}

// ---- The digest: what /live lists ----

/** The most cards /live shows. Past this the page stops being a glance; the rest is on Grid. */
export const DIGEST_MAX = 6;

/**
 * One line of the /live alert list. Either a single hazard, or several of a kind folded into
 * one line (every chain-control checkpoint on a highway; every ordinary outage), because a
 * resident needs "chains are required on Highway 4", not eleven checkpoints.
 */
export type DigestItem =
  | { type: 'event'; feature: HazardFeature; rank: number }
  | {
      type: 'rollup';
      /** Stable key for the list. */
      id: string;
      of: 'chain_control' | 'power';
      rank: number;
      severity: string;
      title: string;
      /** A short line under the title: the places, or the largest outage. */
      where: string;
      /** How many feed records this line stands for. */
      count: number;
      source: string;
    };

export interface StreamDigest {
  items: DigestItem[];
  /** Feed records behind the items shown. */
  shown: number;
  /** Feed records not shown here at all (planned road work, minor incidents, overflow). */
  rest: number;
  /** What most of the rest is, in the feed's own word for it ("Road incident"), or null. */
  restMostly: string | null;
}

const titleCase = (text: string): string =>
  text
    .toLowerCase()
    .replace(/(^|[\s.-])([a-z])/g, (_, lead: string, c: string) => lead + c.toUpperCase());

/**
 * The few things worth a card, most urgent first, and a count of everything else.
 *
 * Shown singly: evacuations, wildfires, weather alerts, a non-normal fire-weather state,
 * earthquakes, a PSPS, a closure point, and any road report at SEVERE or above. Folded into
 * one line each: chain-control checkpoints per highway, and ordinary outages. Left to Grid:
 * planned road work and minor incidents. Nothing is hidden silently: `rest` counts it and the
 * page says so and links to it.
 */
export function deriveDigest(snapshot: HazardsSnapshot): StreamDigest {
  const stream = deriveStream(snapshot);
  const items: DigestItem[] = [];
  const chains = new Map<string, HazardFeature[]>();
  const outages: HazardFeature[] = [];
  const left: HazardFeature[] = [];
  for (const f of stream) {
    const p = f.properties;
    const layer = String(p.layer).toLowerCase();
    const closed = p.category === 'closed' || String(p.status).toUpperCase() === 'CLOSED';
    if (layer === 'chain_control' && !closed) {
      const highway = String(
        (p.chainControl as { highway?: string } | undefined)?.highway || 'the corridor'
      );
      chains.set(highway, [...(chains.get(highway) ?? []), f]);
    } else if (layer === 'power' && p.category !== 'psps') outages.push(f);
    else if (layer === 'road_incident' && rankOf(f) < SEVERITY_RANK.SEVERE) left.push(f);
    else items.push({ type: 'event', feature: f, rank: rankOf(f) });
  }
  // One of a kind keeps its own card (and its detail: a lone outage's restoration estimate,
  // a lone checkpoint's place); folding starts at two.
  // Highways in number order, so the corridor's own (Highway 4) leads its neighbours.
  const number = (highway: string) => Number(/\d+/.exec(highway)?.[0] ?? Infinity);
  for (const [highway, group] of [...chains].sort((a, b) => number(a[0]) - number(b[0]))) {
    if (group.length === 1) {
      items.push({ type: 'event', feature: group[0], rank: rankOf(group[0]) });
      continue;
    }
    const top = group.reduce((a, f) => (rankOf(f) > rankOf(a) ? f : a));
    const levels = [
      ...new Set(
        group
          .map((f) =>
            String((f.properties.chainControl as { level?: string } | undefined)?.level ?? '')
          )
          .filter(Boolean)
      ),
    ].sort();
    const places = [
      ...new Set(group.map((f) => titleCase(String(f.properties.areaLabel ?? ''))).filter(Boolean)),
    ];
    items.push({
      type: 'rollup',
      id: `chain:${highway}`,
      of: 'chain_control',
      rank: rankOf(top),
      severity: String(top.properties.severity),
      title: `Chain control${levels.length ? ` ${levels.join(', ')}` : ''} on ${highway}`,
      where: places.join(' · '),
      count: group.length,
      source: top.properties.source?.name ?? '',
    });
  }
  if (outages.length === 1)
    items.push({ type: 'event', feature: outages[0], rank: rankOf(outages[0]) });
  else if (outages.length) {
    const top = outages.reduce((a, f) => (rankOf(f) > rankOf(a) ? f : a));
    const customers = outages.reduce((n, f) => n + (f.properties.power?.customersAffected ?? 0), 0);
    const largest = outages.reduce((a, f) =>
      (f.properties.power?.customersAffected ?? 0) > (a.properties.power?.customersAffected ?? 0)
        ? f
        : a
    );
    items.push({
      type: 'rollup',
      id: 'power:outages',
      of: 'power',
      rank: rankOf(top),
      severity: String(top.properties.severity),
      title: `${customers.toLocaleString('en-US')} ${customers === 1 ? 'customer' : 'customers'} without power in ${outages.length} ${outages.length === 1 ? 'outage' : 'outages'}`,
      where: `Largest: ${largest.properties.headline}`,
      count: outages.length,
      source: top.properties.source?.name ?? '',
    });
  }
  // Most urgent first; the stream's own order (rank, then newest) breaks ties among events.
  const order = new Map(stream.map((f, i) => [f.properties.id, i]));
  // Folded lines follow the events of their rank, in the order they were made (highway number, then outages).
  const made = new Map(items.map((item, i) => [item, i]));
  const at = (item: DigestItem) =>
    item.type === 'event'
      ? (order.get(item.feature.properties.id) ?? 0)
      : stream.length + (made.get(item) ?? 0);
  items.sort((a, b) => b.rank - a.rank || at(a) - at(b));
  const kept = items.slice(0, DIGEST_MAX);
  const dropped = items.slice(DIGEST_MAX);
  const size = (item: DigestItem) => (item.type === 'event' ? 1 : item.count);
  const shown = kept.reduce((n, item) => n + size(item), 0);
  // What the rest mostly is: the unshown records' commonest kind, by the feed's own label.
  const kinds = new Map<string, number>();
  for (const f of left) kinds.set(f.properties.kind, (kinds.get(f.properties.kind) ?? 0) + 1);
  for (const item of dropped) {
    const kind =
      item.type === 'event'
        ? item.feature.properties.kind
        : item.of === 'power'
          ? 'Power outage'
          : 'Chain control';
    kinds.set(kind, (kinds.get(kind) ?? 0) + size(item));
  }
  const rest = stream.length - shown;
  const mostly = [...kinds].sort((a, b) => b[1] - a[1])[0];
  return {
    items: kept,
    shown,
    rest,
    restMostly: mostly && mostly[1] * 2 > rest ? mostly[0] : null,
  };
}

export interface SituationSummary {
  /** Highest tone present in the locally-relevant stream. */
  highestRank: number;
  /**
   * Counts, or `null` when that layer's source is UNAVAILABLE — so an outage reads as an
   * honest "unknown", never a false `0`/all-clear. A clean empty success (OK, or STALE
   * served from the last good fetch) is a real `0`. Mirrors The Grid's per-layer
   * `sourceStatus` and the evacuation no-data-vs-error split (CHANGELOG 2026-06-29).
   */
  wildfires: number | null;
  evacuations: number | null;
  evacuationStatus: string;
  /** Weather alerts IN EFFECT now — a SCHEDULED one is counted below, not here. */
  weatherAlerts: number | null;
  /** Issued, but the hazard window hasn't opened yet (see `isScheduled`). */
  weatherAlertsUpcoming: number | null;
  /** PSPS events that put up the site-wide banner (`pspsBannerEvent`): a Warning, or under way. */
  powerShutoffs: number | null;
  fireWeather: string; // NORMAL | ELEVATED | RED_FLAG | UNKNOWN
  syncedAt: string | null;
}

/**
 * Locally-recomputed summary (honest counts from filtered features).
 *
 * `now` is a parameter rather than a `Date.now()` read inside so the function stays pure and
 * testable — an alert is "upcoming" relative to a clock, and the screenshot harness freezes
 * that clock. Callers on the live path take the default.
 */
export function deriveSituationSummary(
  snapshot: HazardsSnapshot,
  now: number = Date.now()
): SituationSummary {
  const stream = deriveStream(snapshot);

  // A layer's relevant-feature count, or null when its source is UNAVAILABLE (a sync
  // error → "unknown", never a false 0). OK/STALE both yield a real count: a clean empty
  // success is 0; STALE serves the last good fetch. The Grid guarantees an error
  // never replays a cached 0 (CHANGELOG 2026-06-29).
  const statusOf = (layer: string): string =>
    snapshot.layers?.[layer]?.metadata?.sourceStatus ?? 'UNAVAILABLE';
  const countOrUnknown = (layer: string, keep?: (f: HazardFeature) => boolean): number | null => {
    if (statusOf(layer) === 'UNAVAILABLE') return null;
    const feats = layerFeatures(snapshot, layer);
    return keep ? feats.filter(keep).length : feats.length;
  };

  const fwFeature = (snapshot.layers?.fire_weather?.features ?? [])[0];
  // The hazard fire_weather layer reports state as e.g. "normal"/"red-flag" (lowercase,
  // hyphenated) — normalize to the canonical NORMAL/ELEVATED/RED_FLAG enum.
  const fireState = (fwFeature?.properties.fireWeather?.state ?? 'unknown')
    .toUpperCase()
    .replace(/-/g, '_');

  return {
    highestRank: stream.reduce((m, f) => Math.max(m, rankOf(f)), 0),
    wildfires: countOrUnknown('wildfire'),
    evacuations: countOrUnknown('evacuation'),
    evacuationStatus: statusOf('evacuation'),
    weatherAlerts: countOrUnknown('weather_alert', (f) => !isScheduled(f, now)),
    weatherAlertsUpcoming: countOrUnknown('weather_alert', (f) => isScheduled(f, now)),
    powerShutoffs:
      statusOf('power') === 'UNAVAILABLE'
        ? null
        : layerFeatures(snapshot, 'power').filter((f) => pspsBannerEvent([f]) != null).length,
    fireWeather: fireState,
    syncedAt: snapshot.summary?.generatedAt ?? snapshot.fetchedAt ?? null,
  };
}

/**
 * The homepage "Active Alerts" tile: the three alert-grade /live tiles (wildfires +
 * evacuations + weather alerts) collapsed into one honest at-a-glance count. Built from
 * the same `deriveSituationSummary` so the homepage can never say "None" while /live shows
 * active hazards (the whole point — an all-clear that contradicts the live feed is exactly
 * the data-honesty failure the style guide forbids).
 *
 * Honesty rules: a `null` count is a source outage → the tile is "Unknown" (never a false
 * 0/all-clear) UNLESS a known count already proves an alert is live, in which case we show
 * that (an undercount is fine when we're already flagging). Orange (alarm) is reserved for
 * a genuine life-safety hazard — an active wildfire or evacuation, or a PSPS that has put up
 * the site-wide banner; weather-only is elevated. The PSPS is counted for the same reason the
 * banner exists: the homepage must not show "Power Shutoff" above an "Active Alerts: None".
 *
 * A SCHEDULED weather alert is deliberately NOT counted: this tile says how many alerts are
 * **active**, and a watch that doesn't start until Thursday isn't one. It is not hidden —
 * /live's weather tile reads "N Upcoming" and the alert stream carries the card. The
 * invariant this tile exists to protect (the homepage can never say "None" while /live shows
 * an active hazard) is unaffected, because an upcoming alert isn't an active hazard.
 */
export function deriveActiveAlertsTile(summary: SituationSummary): {
  value: string;
  state: Tone;
} {
  const parts = [
    summary.wildfires,
    summary.evacuations,
    summary.weatherAlerts,
    summary.powerShutoffs,
  ];
  let total = 0;
  for (const c of parts) total += c ?? 0;
  const anyUnknown = parts.some((c) => c == null);
  const lifeSafety =
    (summary.wildfires ?? 0) > 0 ||
    (summary.evacuations ?? 0) > 0 ||
    (summary.powerShutoffs ?? 0) > 0;
  if (total > 0) return { value: `${total} Active`, state: lifeSafety ? 'alarm' : 'elevated' };
  if (anyUnknown) return { value: 'Unknown', state: 'muted' };
  return { value: 'None', state: 'ok' };
}
