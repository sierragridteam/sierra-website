/**
 * Site-wide banner decision tests (`bun test`). Pure: what the band says, when it may rewrite
 * its role="alert" region, and when the power layer is worth fetching at all.
 */
import { test, expect } from 'bun:test';
import { deriveBanner, powerCheck, pspsFromLayer, weatherCheck, weatherFromLayer } from './banner';
import type { HazardFeature, SummaryDomain } from './hazards';

function psps(stage: string, status: string, headline = 'PSPS — 23,491 customers'): HazardFeature {
  return {
    type: 'Feature',
    geometry: null,
    properties: {
      id: 'psps:1',
      layer: 'POWER',
      kind: 'Public Safety Power Shutoff',
      category: 'psps',
      severity: 'MODERATE',
      severityRank: 2,
      status,
      headline,
      source: { id: 'psps', name: 'PG&E PSPS' },
      power: { stage, deEnergizationStart: '2026-10-15T03:00:00Z' },
    },
  };
}
const calm = { activeEvacuations: 0, topEvents: [], wildfire: [], psps: null, weather: null };

test('calm is hidden; evacuation outranks wildfire outranks a PSPS', () => {
  expect(deriveBanner(calm).active).toBe(false);
  const shutoff = psps('Warning', 'SCHEDULED');
  expect(deriveBanner({ ...calm, psps: shutoff }).label).toBe('Power Shutoff');
  const fire = [{ properties: { headline: 'Owl Fire' } }];
  expect(deriveBanner({ ...calm, wildfire: fire, psps: shutoff }).label).toBe('Active Wildfire');
  expect(deriveBanner({ ...calm, activeEvacuations: 1, wildfire: fire, psps: shutoff }).label).toBe(
    'Evacuation'
  );
});

test('a PSPS headline carries no counts, and says planned vs under way', () => {
  const planned = deriveBanner({ ...calm, psps: psps('Warning', 'SCHEDULED') });
  expect(planned.headline).toBe(
    'PG&E plans to shut off power in parts of the service area from Wed 20:00 PT'
  );
  const off = deriveBanner({ ...calm, psps: psps('Warning', 'ACTIVE') });
  expect(off.headline).toBe('PG&E has shut off power in parts of the service area');
});

test('revised PG&E counts do not re-announce the alert; a change of stage does', () => {
  const a = deriveBanner({ ...calm, psps: psps('Warning', 'SCHEDULED', 'PSPS — 23,491') });
  const b = deriveBanner({ ...calm, psps: psps('Warning', 'SCHEDULED', 'PSPS — 24,010') });
  const c = deriveBanner({ ...calm, psps: psps('Warning', 'ACTIVE', 'PSPS — 24,010') });
  expect(b.sig).toBe(a.sig);
  expect(c.sig).not.toBe(a.sig);
});

const domain = (status: string, highestSeverity: string) =>
  [{ domain: 'power', status, highestSeverity, activeCount: 1, headlines: [] }] as SummaryDomain[];

test('the power layer is fetched only when the summary allows a PSPS', () => {
  expect(powerCheck(domain('OK', 'MINOR'))).toBe('none');
  expect(powerCheck(domain('OK', 'INFO'))).toBe('none');
  expect(powerCheck(domain('OK', 'MODERATE'))).toBe('fetch');
  expect(powerCheck(domain('UNAVAILABLE', 'INFO'))).toBe('unknown');
  // No power domain at all (an older Grid) → fetch rather than assume.
  expect(powerCheck([])).toBe('fetch');
  expect(powerCheck(undefined)).toBe('fetch');
});

test('an unreadable power layer is unknown, never "no PSPS"', () => {
  expect(pspsFromLayer(null)).toBeUndefined();
  expect(
    pspsFromLayer({ features: [], metadata: { sourceStatus: 'UNAVAILABLE' } })
  ).toBeUndefined();
  expect(pspsFromLayer({ features: [], metadata: { sourceStatus: 'OK' } })).toBeNull();
  expect(
    pspsFromLayer({ features: [psps('Warning', 'SCHEDULED')], metadata: { sourceStatus: 'OK' } })
  ).not.toBeNull();
});

// ---- Severe weather ----

// Friday 13 November 2026, 13:40 PST: the Winter Storm Warning this rule was written for.
const NOW = Date.parse('2026-11-13T21:40:00Z');

function wx(over: Partial<HazardFeature['properties']> = {}): HazardFeature {
  return {
    type: 'Feature',
    geometry: null,
    properties: {
      id: 'wx:storm',
      layer: 'WEATHER_ALERT',
      kind: 'Weather alert',
      category: 'Winter Storm Warning',
      severity: 'SEVERE',
      severityRank: 3,
      status: 'ACTIVE',
      headline: 'Winter Storm Warning',
      effective: '2026-11-13T20:01:00Z',
      expires: '2026-11-14T18:00:00Z',
      source: { id: 'nws', name: 'NWS Sacramento CA' },
      weather: { event: 'Winter Storm Warning', source: 'NWS', zones: ['CAZ128'] },
      ...over,
    },
  };
}
const layer = (...features: HazardFeature[]) => ({ features, metadata: { sourceStatus: 'OK' } });
const shown = (...features: HazardFeature[]) =>
  deriveBanner({ ...calm, weather: weatherFromLayer(layer(...features), NOW) ?? null }, NOW);

test('a severe weather alert in effect shows, with its end in Pacific time', () => {
  const b = shown(wx());
  expect(b.active).toBe(true);
  expect(b.label).toBe('Severe Weather');
  expect(b.headline).toBe('Winter Storm Warning in effect until Sat 10:00 PT');
  expect(shown(wx({ severity: 'EXTREME', severityRank: 4 })).active).toBe(true);
  // No end time from NWS: say it is in effect, never invent one.
  expect(shown(wx({ expires: null })).headline).toBe('Winter Storm Warning in effect');
});

test('a severe alert that has not started does not show', () => {
  const watch = wx({
    status: 'SCHEDULED',
    effective: '2026-11-15T18:00:00Z',
    expires: '2026-11-16T18:00:00Z',
  });
  expect(shown(watch).active).toBe(false);
  // The map layers once omitted `status`; the onset then decides (see `isScheduled`).
  expect(shown(wx({ status: undefined, effective: '2026-11-15T18:00:00Z' })).active).toBe(false);
  expect(shown(wx({ status: undefined })).active).toBe(true);
});

test('an advisory in effect does not show', () => {
  const wind = wx({
    id: 'wx:wind',
    severity: 'MODERATE',
    severityRank: 2,
    headline: 'Wind Advisory',
    weather: { event: 'Wind Advisory' },
  });
  expect(shown(wind).active).toBe(false);
  expect(shown(wx({ severity: 'MINOR', severityRank: 1 })).active).toBe(false);
  // Today's feed: the advisory is listed alongside the warning, and only the warning is named.
  expect(shown(wind, wx()).headline).toBe('Winter Storm Warning in effect until Sat 10:00 PT');
});

test('an expired or ended alert does not show', () => {
  expect(shown(wx({ expires: '2026-11-13T21:00:00Z' })).active).toBe(false);
  expect(shown(wx({ status: 'EXPIRED' })).active).toBe(false);
  expect(shown(wx({ status: 'CANCELLED' })).active).toBe(false);
  // An alert the island kept through a failed poll comes down at its own end time.
  const kept = { ...calm, weather: wx() };
  expect(deriveBanner(kept, NOW).active).toBe(true);
  expect(deriveBanner(kept, Date.parse('2026-11-14T18:00:00Z')).active).toBe(false);
});

test('only weather alerts qualify, whatever else is in the layer', () => {
  expect(shown(wx({ layer: 'FIRE_WEATHER' })).active).toBe(false);
  expect(shown(wx({ layer: 'weather_alert', status: 'active' })).active).toBe(true);
});

test('weather ranks below an evacuation, a wildfire and a PSPS', () => {
  const storm = wx();
  const shutoff = psps('Warning', 'SCHEDULED');
  const fire = [{ properties: { headline: 'Owl Fire' } }];
  expect(deriveBanner({ ...calm, weather: storm }, NOW).label).toBe('Severe Weather');
  expect(deriveBanner({ ...calm, weather: storm, psps: shutoff }, NOW).label).toBe('Power Shutoff');
  expect(deriveBanner({ ...calm, weather: storm, wildfire: fire }, NOW).label).toBe(
    'Active Wildfire'
  );
  const evac = { ...calm, activeEvacuations: 1, weather: storm, wildfire: fire, psps: shutoff };
  expect(deriveBanner(evac, NOW).label).toBe('Evacuation');
});

test('several severe alerts: the most severe, then the longest, whatever the feed order', () => {
  const short = wx({ id: 'wx:a', expires: '2026-11-14T03:00:00Z' });
  const long = wx({ id: 'wx:b' });
  const extreme = wx({
    id: 'wx:c',
    severity: 'EXTREME',
    severityRank: 4,
    weather: { event: 'Blizzard Warning' },
    expires: '2026-11-14T01:00:00Z',
  });
  expect(weatherFromLayer(layer(short, long), NOW)?.properties.id).toBe('wx:b');
  expect(weatherFromLayer(layer(long, short), NOW)?.properties.id).toBe('wx:b');
  expect(weatherFromLayer(layer(short, extreme, long), NOW)?.properties.id).toBe('wx:c');
});

test('an NWS update under a new id does not re-announce; a new end time does', () => {
  const a = deriveBanner({ ...calm, weather: wx() }, NOW);
  const b = deriveBanner({ ...calm, weather: wx({ id: 'wx:storm.002' }) }, NOW);
  const c = deriveBanner({ ...calm, weather: wx({ expires: '2026-11-14T22:00:00Z' }) }, NOW);
  expect(b.sig).toBe(a.sig);
  expect(c.sig).not.toBe(a.sig);
});

test('the weather layer is fetched only when the summary allows a severe alert', () => {
  const weather = (status: string, highestSeverity: string) =>
    [
      { domain: 'weather', status, highestSeverity, activeCount: 1, headlines: [] },
    ] as SummaryDomain[];
  expect(weatherCheck(weather('OK', 'MODERATE'))).toBe('none');
  expect(weatherCheck(weather('OK', 'SEVERE'))).toBe('fetch');
  expect(weatherCheck(weather('STALE', 'EXTREME'))).toBe('fetch');
  expect(weatherCheck(weather('UNAVAILABLE', 'INFO'))).toBe('unknown');
  expect(weatherCheck(undefined)).toBe('fetch');
});

test('an unreadable weather layer is unknown, never "no alert"', () => {
  expect(weatherFromLayer(null, NOW)).toBeUndefined();
  expect(
    weatherFromLayer({ features: [], metadata: { sourceStatus: 'UNAVAILABLE' } }, NOW)
  ).toBeUndefined();
  expect(weatherFromLayer(layer(), NOW)).toBeNull();
});
