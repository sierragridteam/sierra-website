/** formatAlertBody tests (`bun test`): NWS teletype text → escaped HTML blocks. */
import { test, expect } from 'bun:test';
import { formatAlertBody } from './alert-text';

const LIVE = `* WHAT...Snow is expected for elevations above 6000 feet. Total snow
accumulations up to a foot, with up to 2 feet at the highest peaks.
Winds could gust as high as 60 mph.

* WHERE...Northern Sierra above 6000 feet, including Highway 50,
Interstate 80, State Route 4, State Route 108.

* WHEN...From Friday morning through Monday afternoon.

* IMPACTS...Travel could be very difficult. Strong
winds could cause downed tree branches.`;

const label = (l: string, t: string) =>
  `<p class="stream__desc"><strong class="stream__desc-label">${l}</strong> ${t}</p>`;

test('live Winter Storm Watch: labelled sections, wraps unwrapped', () => {
  expect(formatAlertBody(LIVE)).toBe(
    label(
      'WHAT',
      'Snow is expected for elevations above 6000 feet. Total snow accumulations up to a foot, with up to 2 feet at the highest peaks. Winds could gust as high as 60 mph.'
    ) +
      label(
        'WHERE',
        'Northern Sierra above 6000 feet, including Highway 50, Interstate 80, State Route 4, State Route 108.'
      ) +
      label('WHEN', 'From Friday morning through Monday afternoon.') +
      label(
        'IMPACTS',
        'Travel could be very difficult. Strong winds could cause downed tree branches.'
      )
  );
});

test('a Cancel-style single paragraph is one unwrapped <p>', () => {
  expect(
    formatAlertBody('The Winter Storm Watch is no longer in effect.\nIt has been cancelled.')
  ).toBe(
    '<p class="stream__desc">The Winter Storm Watch is no longer in effect. It has been cancelled.</p>'
  );
});

test('CRLF input matches LF input', () => {
  expect(formatAlertBody(LIVE.replace(/\n/g, '\r\n'))).toBe(formatAlertBody(LIVE));
});

test('already-clean text is unchanged apart from the <p> wrapper', () => {
  expect(formatAlertBody('Snow is expected. Winds could gust.')).toBe(
    '<p class="stream__desc">Snow is expected. Winds could gust.</p>'
  );
});

test('empty, blank and nullish input render nothing', () => {
  for (const v of [null, undefined, '', '  \n\n \r\n']) expect(formatAlertBody(v)).toBe('');
});

test('plain bullets stay a list, wrapped bullets are joined', () => {
  expect(
    formatAlertBody('Precautions:\n- Slow down and\n  allow extra time.\n- Carry chains.')
  ).toBe(
    '<p class="stream__desc">Precautions:</p><ul class="stream__desc-list"><li>Slow down and allow extra time.</li><li>Carry chains.</li></ul>'
  );
  expect(formatAlertBody('* one\n* two')).toBe(
    '<ul class="stream__desc-list"><li>one</li><li>two</li></ul>'
  );
});

test('everything is escaped, including labels', () => {
  const out = formatAlertBody('* WHAT...<script>x</script> & "y"\n\n<b>hi</b>');
  expect(out).not.toContain('<script>');
  expect(out).not.toContain('<b>');
  expect(out).toContain('&lt;script&gt;x&lt;/script&gt; &amp; &quot;y&quot;');
});

test('lowercase "* text..." is not mistaken for a label', () => {
  expect(formatAlertBody('* snow...')).toBe('<ul class="stream__desc-list"><li>snow...</li></ul>');
});
