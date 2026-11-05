import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { unstable_dev, type Unstable_DevWorker } from 'wrangler';
import { LOCATIONS } from '../constants';
import { locationH1Text } from '../lib/locationSchema';
import { isPrerenderPath, LOCATION_SLUGS, SITEMAP_PATHS, prerenderMarker } from '../lib/prerenderRoutes';
import { bakedDateWindowPhrases, isWithinLondonWindow, londonDate } from '../lib/venueNotice';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(websiteRoot, 'dist');

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function decode(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function h1Texts(html: string): string[] {
  return [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => decode(match[1]));
}

function builtFile(route: string): string {
  const relative = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`;
  return fs.readFileSync(path.join(distDir, relative), 'utf8');
}

function expectedH1(route: string): string {
  if (route === '/') return 'Heroes Rise Here';
  if (route === '/mission') return 'OUR MISSION';
  if (route === '/careers') return 'JOIN THE TEAM';
  if (route === '/3x3-gameday') return '3x3 Gameday';
  if (route === '/policies') return 'Policies & Privacy';
  const slug = route.split('/')[2];
  const location = LOCATIONS.find((item) => item.slug === slug);
  if (!location) throw new Error(`missing location ${route}`);
  return locationH1Text(location);
}

const BODY_TEXT: Record<string, string> = {
  '/mission': 'positively impact the lives of 10,000 children',
  '/careers': 'Help us inspire the heroes of tomorrow',
  '/policies': 'Our commitment to safety, transparency, and the protection of our community.',
  '/3x3-gameday': 'Experience the fast-paced excitement of 3x3 basketball',
};

function assertDocument(html: string, route: string, label: string): void {
  const headings = h1Texts(html);
  assert(headings.length === 1, `${label} ${route} has ${headings.length} h1s: ${headings.join(' | ')}`);
  assert(headings[0] === expectedH1(route), `${label} ${route} h1 was "${headings[0]}"`);
  const body = BODY_TEXT[route];
  if (body) assert(html.includes(body), `${label} ${route} is missing body text`);
  if (!route.startsWith('/location/')) return;
  const slug = route.split('/')[2];
  const location = LOCATIONS.find((item) => item.slug === slug);
  if (!location) throw new Error(`missing location ${route}`);
  assert(html.includes(location.address), `${label} ${route} is missing the venue address`);
  for (const town of LOCATION_SLUGS) {
    assert(html.includes(`href="/location/${town}"`), `${label} ${route} is missing /location/${town}`);
  }
  for (const phrase of bakedDateWindowPhrases(location)) {
    if (label === 'built') {
      assert(!html.includes(phrase), `built ${route} baked date-window text: ${phrase}`);
    }
  }
}

function jsonLd(html: string): { id: string; data: Record<string, unknown> }[] {
  return [...html.matchAll(/<script type="application\/ld\+json" id="([^"]+)">([\s\S]*?)<\/script>/g)].map((match) => ({
    id: match[1],
    data: JSON.parse(match[2]) as Record<string, unknown>,
  }));
}

function assertBuilt(): void {
  for (const route of SITEMAP_PATHS) {
    const html = builtFile(route);
    assert(html.includes(prerenderMarker(route)), `built ${route} is missing its prerender marker`);
    assert(!html.includes('application/ld+json'), `built ${route} should not bake JSON-LD`);
    assert(!html.includes('__HH_LONDON_DATE__'), `built ${route} should not bake the London date`);
    assertDocument(html, route, 'built');
    if (route.startsWith('/location/')) {
      assert(html.includes('data-hh-date-slot='), `built ${route} is missing date-window markers`);
      assert(html.includes('data-hh-embed="Hoop Heroes Booking Calendar"'), `built ${route} is missing the booking placeholder`);
      assert(html.includes('data-hh-embed="Location Map"'), `built ${route} is missing the map placeholder`);
      assert(!/<iframe\b[^>]*(goteamup|maps\.google|reputationhub)/i.test(html), `built ${route} baked a booking, map, or review iframe`);
    }
  }
  const shell = fs.readFileSync(path.join(distDir, '_shell.html'), 'utf8');
  assert(shell.includes('<!--hh-spa-shell-->'), 'spa shell marker');
  assert(shell.includes('<div id="root"></div>'), 'spa shell root is empty');
  console.log(`built HTML checks passed for ${SITEMAP_PATHS.length} routes`);
}

async function assertServed(worker: Unstable_DevWorker): Promise<void> {
  const origin = `http://127.0.0.1:${worker.port}`;
  for (const route of SITEMAP_PATHS) {
    for (const suffix of route === '/' ? [''] : ['', '/']) {
      const response = await worker.fetch(`${origin}${route}${suffix}`);
      const html = await response.text();
      assert(response.status === 200, `${route}${suffix} status ${response.status}`);
      assertDocument(html, route, 'served');
      assert(html.includes('__HH_LONDON_DATE__'), `served ${route} is missing the London date stamp`);
      const blocks = jsonLd(html);
      if (route === '/') {
        assert(blocks.length === 1 && blocks[0].id === 'hh-org-schema', 'home JSON-LD id');
        assert(blocks[0].data['@type'] === 'SportsOrganization', 'home JSON-LD @type');
      } else if (route.startsWith('/location/')) {
        assert(blocks.length === 1 && blocks[0].id === 'hh-location-schema', `${route} JSON-LD id`);
        assert(blocks[0].data['@type'] === 'SportsActivityLocation', `${route} JSON-LD @type`);
        assert(!html.includes('data-hh-date-slot='), `served ${route} still has an unreplaced date marker`);
      } else {
        assert(blocks.length === 0, `${route} should not gain JSON-LD`);
      }
    }
  }

  const today = new Date();
  for (const slug of ['aylesbury', 'holmer-green'] as const) {
    const location = LOCATIONS.find((item) => item.slug === slug);
    const venue = location?.temporaryVenues?.[0];
    if (!location || !venue) throw new Error(`missing ${slug} venue`);
    const response = await worker.fetch(`${origin}/location/${slug}`);
    const html = await response.text();
    const active = isWithinLondonWindow(venue.showFrom, venue.showUntil, today);
    assert(
      html.includes(venue.tickerText) === active,
      `${slug} ticker ${active ? 'missing' : 'present'} for London ${londonDate(today)}`,
    );
  }

  const missing = await worker.fetch(`${origin}/this-page-is-not-real`);
  assert(missing.status === 404, `unknown path status ${missing.status}`);
  const missingHtml = await missing.text();
  assert(missingHtml.includes('<!--hh-spa-shell-->'), 'unknown path serves the spa shell');
  assert(!missingHtml.includes('Kids Basketball Classes in'), 'unknown path is not a location prerender');

  const shell = await worker.fetch(`${origin}/_shell.html`);
  assert(shell.status === 404, `_shell.html status ${shell.status}`);

  const llms = await worker.fetch(`${origin}/llms.txt`);
  assert(llms.status === 404, `llms.txt status ${llms.status}`);
  assert((llms.headers.get('content-type') || '').includes('text/plain'), 'llms.txt content type');

  const about = await worker.fetch(`${origin}/about`, { redirect: 'manual' });
  assert(about.status === 301, `/about status ${about.status}`);
  assert((about.headers.get('location') || '').endsWith('/mission'), `/about location ${about.headers.get('location')}`);

  const browser = await chromium.launch({ headless: true });
  try {
    for (const route of ['/', '/location/marlow', '/location/sandhurst', '/location/aylesbury']) {
      const page = await browser.newPage();
      const logs: string[] = [];
      page.on('console', (message) => logs.push(`${message.type()}: ${message.text()}`));
      page.on('pageerror', (error) => logs.push(`pageerror: ${error.message}`));
      await page.goto(`${origin}${route}`, { waitUntil: 'load', timeout: 30000 });
      if (route === '/') {
        await page.waitForSelector('iframe[title="Customer Reviews"]', { timeout: 10000 });
      } else {
        await page.waitForSelector('iframe[title="Hoop Heroes Booking Calendar"]', { timeout: 10000 });
        await page.waitForSelector('iframe[title="Location Map"]', { timeout: 10000 });
        const mapSrc = await page.locator('iframe[title="Location Map"]').getAttribute('src');
        assert(mapSrc?.includes('maps.google.com'), `${route} map src ${mapSrc}`);
        const bookingSrc = await page.locator('iframe[title="Hoop Heroes Booking Calendar"]').getAttribute('src');
        assert(bookingSrc?.includes('goteamup.com'), `${route} booking src ${bookingSrc}`);
      }
      const hydration = logs.filter((line) => /hydrat|did not match|server rendered HTML|server HTML/i.test(line));
      assert(hydration.length === 0, `${route} hydration warnings:\n${hydration.join('\n')}\nall logs:\n${logs.join('\n')}`);
      await page.close();
      console.log(`hydration ok ${route}`);
    }
  } finally {
    await browser.close();
  }
  console.log('served HTML and hydration checks passed');
}

async function main(): Promise<void> {
  assert(SITEMAP_PATHS.every((route) => isPrerenderPath(route)), 'routes are prerender paths');
  assertBuilt();
  const worker = await unstable_dev(path.join(websiteRoot, 'worker/index.ts'), {
    config: path.join(websiteRoot, 'wrangler.jsonc'),
    ip: '127.0.0.1',
    port: 8787,
    local: true,
    experimental: { disableExperimentalWarning: true },
  });
  try {
    await assertServed(worker);
  } finally {
    await worker.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
