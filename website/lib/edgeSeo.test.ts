import { apexWwwRedirectTarget, isLlmsTxtRequest } from './edgeSeo.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

assertEqual(
  apexWwwRedirectTarget(new URL('https://hoopheroes.co.uk/location/marlow?gclid=abc')),
  'https://www.hoopheroes.co.uk/location/marlow?gclid=abc',
  'apex keeps path and query',
);
assertEqual(
  apexWwwRedirectTarget(new URL('https://hoopheroes.co.uk/')),
  'https://www.hoopheroes.co.uk/',
  'apex homepage',
);
assertEqual(
  apexWwwRedirectTarget(new URL('https://hoopheroes.co.uk/aylesbury?utm_source=flyer')),
  'https://www.hoopheroes.co.uk/aylesbury?utm_source=flyer',
  'apex legacy path is not rewritten on this hop',
);
assertEqual(apexWwwRedirectTarget(new URL('https://hoopheroes.co.uk/api/health')), null, 'apex /api is not redirected');
assertEqual(apexWwwRedirectTarget(new URL('https://hoopheroes.co.uk/api/contact')), null, 'apex /api/contact is not redirected');
assertEqual(apexWwwRedirectTarget(new URL('https://www.hoopheroes.co.uk/location/marlow')), null, 'www is already canonical');
assertEqual(
  apexWwwRedirectTarget(new URL('https://cursor-local-seo-stage1-8831-hoop-heroes-website.jamie-667.workers.dev/location/marlow')),
  null,
  'workers.dev preview is not redirected',
);
assertEqual(apexWwwRedirectTarget(new URL('http://localhost:8787/location/marlow')), null, 'local dev is not redirected');

assert(isLlmsTxtRequest('/llms.txt'), '/llms.txt is the missing file');
assert(!isLlmsTxtRequest('/robots.txt'), 'robots.txt is a real file');
assert(!isLlmsTxtRequest('/location/marlow'), 'location pages are not llms.txt');
