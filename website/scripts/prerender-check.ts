import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright';
import { unstable_dev, type Unstable_DevWorker } from 'wrangler';
import { LOCATIONS } from '../constants';
import { HOME_DOCUMENT_TITLE, locationDocumentTitle, locationH1Text } from '../lib/locationSchema';
import { isPrerenderPath, LOCATION_SLUGS, SITEMAP_PATHS, prerenderMarker } from '../lib/prerenderRoutes';
import { injectServedHtml } from '../lib/dateWindowInject';
import { bakedDateWindowPhrases, dateOnLondonDay, isWithinLondonWindow, londonDate } from '../lib/venueNotice';

const APPROVED_REVIEW_BADGE = 'Rated 4.9★ on Google · 110+ reviews';

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

function metaAttr(html: string, attr: 'name' | 'property', key: string): string | null {
  const match = html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, 'i'));
  if (!match) return null;
  return match[1]
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
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
    if (!location) throw new Error(`missing ${slug}`);
    const venues = location.temporaryVenues ?? [];
    if (!venues.length) throw new Error(`missing ${slug} venue`);
    const response = await worker.fetch(`${origin}/location/${slug}`);
    const html = await response.text();
    const activeVenues = venues.filter((venue) => isWithinLondonWindow(venue.showFrom, venue.showUntil, today));
    for (const venue of venues) {
      const active = activeVenues.includes(venue);
      assert(
        html.includes(venue.tickerText) === active,
        `${slug} ticker ${active ? 'missing' : 'present'} for London ${londonDate(today)}: ${venue.tickerText}`,
      );
    }
    if (slug === 'holmer-green' && activeVenues.length > 0) {
      const venue = activeVenues[0];
      assert(html.includes('Tuesday 10 November'), 'served Holmer Green lists Tuesday 10 November');
      assert(html.includes('Tue 10, 17 and 24 Nov'), 'served Holmer Green ticker lists 10, 17 and 24 Nov');
      assert(html.includes(venue.parking ?? ''), 'served Holmer Green includes the parking guidance');
    }
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
    for (const route of ['/', '/location/marlow', '/location/sandhurst', '/location/aylesbury', '/location/holmer-green']) {
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

      const served = await worker.fetch(`${origin}${route}`);
      const servedHtml = await served.text();
      const servedDescription = metaAttr(servedHtml, 'name', 'description');
      const liveDescription = await page.locator('meta[name="description"]').getAttribute('content');
      if (!liveDescription) throw new Error(`${route} meta description missing after JS`);
      assert(
        liveDescription === servedDescription,
        `${route} meta description changed after JS\nserved: ${servedDescription}\nlive:   ${liveDescription}`,
      );
      for (const property of ['og:title', 'og:description'] as const) {
        const servedOg = metaAttr(servedHtml, 'property', property);
        const liveOg = await page.evaluate((name) => {
          return document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ?? null;
        }, property);
        assert(liveOg === servedOg, `${route} ${property} changed after JS\nserved: ${servedOg}\nlive:   ${liveOg}`);
      }
      if (route.startsWith('/location/')) {
        const slug = route.split('/')[2];
        const location = LOCATIONS.find((item) => item.slug === slug);
        if (!location) throw new Error(`missing location ${route}`);
        assert((await page.title()) === locationDocumentTitle(location), `${route} title was "${await page.title()}"`);
        assert(!liveDescription.includes('Join the best youth basketball classes'), `${route} rewrote the meta description`);
        const visibleText = await page.locator('body').innerText();
        assert(!visibleText.includes('5.0 RATING'), `${route} still shows 5.0 RATING`);
        assert(!visibleText.includes('80+ REVIEWS'), `${route} still shows 80+ REVIEWS`);
        assert(!visibleText.includes('Join the best youth basketball classes'), `${route} still shows the old meta description`);
        if (!location.comingSoon) {
          const bookButton = page.getByRole('button', { name: 'Book Free Taster' });
          await bookButton.waitFor({ state: 'visible', timeout: 5000 });
          const heroText = await bookButton.locator('xpath=..').innerText();
          assert(heroText.includes(APPROVED_REVIEW_BADGE), `${route} hero is missing the approved review badge: ${heroText}`);
          assert(!heroText.includes('5.0'), `${route} hero still shows 5.0: ${heroText}`);
          assert(!heroText.includes('80+'), `${route} hero still shows 80+: ${heroText}`);
          assert((await page.getByText(APPROVED_REVIEW_BADGE, { exact: true }).count()) >= 1, `${route} badge text did not match`);
        } else {
          assert(!visibleText.includes(APPROVED_REVIEW_BADGE), `${route} shows the review badge while coming soon`);
        }
        if (slug === 'marlow') {
          assert(liveDescription.includes('Youth basketball classes for ages 5-15 in Marlow'), `marlow description was "${liveDescription}"`);
          assert(liveDescription.includes('Hoop Heroes Marlow today'), `marlow description was "${liveDescription}"`);
        }
        if (slug === 'sandhurst') {
          assert(liveDescription.includes('Youth basketball classes for ages 5-11 in Sandhurst'), `sandhurst description was "${liveDescription}"`);
          assert(metaAttr(servedHtml, 'property', 'og:description') === liveDescription, 'sandhurst og:description left the worker text');
        }
        if (slug === 'holmer-green') {
          const notice = 'Temporary venue on Tue 10, 17 and 24 Nov: Sir William Ramsay School - see details';
          const parking = 'Please use the main vehicle entrance off Rose Avenue. Park in the school car parks or the front layby, not the Community Centre car park.';
          const rendered = visibleText.toLowerCase();
          assert(rendered.includes(notice.toLowerCase()), 'Holmer Green ticker missing after JS');
          assert(rendered.includes('temporary venue: tuesday 10 november, tuesday 17 november, tuesday 24 november'), 'Holmer Green box heading missing after JS');
          assert(rendered.includes(parking.toLowerCase()), 'Holmer Green parking missing after JS');
          assert(servedHtml.includes(notice), 'served Holmer Green HTML is missing the ticker');
          assert(servedHtml.includes(parking), 'served Holmer Green HTML is missing parking');
        }
      } else if (route === '/') {
        assert((await page.title()) === HOME_DOCUMENT_TITLE, `home title was "${await page.title()}"`);
        const homeText = await page.locator('body').innerText();
        assert(!homeText.includes('5.0 RATING'), 'home still shows 5.0 RATING');
        assert(!homeText.includes('80+ REVIEWS'), 'home still shows 80+ REVIEWS');
        assert(!homeText.includes('5.0'), 'home still shows 5.0');
        assert(!homeText.includes('80+'), 'home still shows 80+');
      }

      await page.close();
      console.log(`hydration ok ${route}`);
    }
    await assertAylesburyOnDate(browser, origin, '2026-11-16');
    await assertAylesburyOnDate(browser, origin, '2026-11-17');
  } finally {
    await browser.close();
  }
  console.log('served HTML and hydration checks passed');
}

const FLOYD_MONDAY_TICKER = 'This Monday only (16 Nov): Sir Henry Floyd, 17:45 start - see details';
const FLOYD_MONDAY_RETURN = 'Back at The Mandeville School as usual from Mon 23 Nov';
const FLOYD_PARKING = "Drive into the shared car park and keep going past the 'School parking from here' signs. Only park in the school parking area by the Gym, shown on the map below. Please don't park in the college spaces: they are camera-monitored and the college issues parking tickets that can't be cancelled.";
const FLOYD_MAP_TITLE = 'Sir Henry Floyd Grammar School Sports Hall map';

async function assertAylesburyOnDate(browser: Browser, origin: string, londonDay: string): Promise<void> {
  const location = LOCATIONS.find((item) => item.slug === 'aylesbury');
  if (!location) throw new Error('missing aylesbury');
  const showing = isWithinLondonWindow('2026-11-12', '2026-11-16', dateOnLondonDay(londonDay));
  const html = injectServedHtml(builtFile('/location/aylesbury'), {
    location,
    now: dateOnLondonDay(londonDay),
  });
  if (showing) {
    const rendered = html.replace(/<!--.*?-->/g, '');
    assert(html.includes(FLOYD_MONDAY_TICKER), `${londonDay} prerender includes the Monday ticker`);
    assert(rendered.includes('Rookies (Age 5-7) 17:45'), `${londonDay} prerender includes 17:45`);
    assert(rendered.includes('Rising Stars (Age 8-11) 18:15'), `${londonDay} prerender includes 18:15`);
    assert(html.includes(FLOYD_MONDAY_RETURN), `${londonDay} prerender includes the return note`);
    assert(decode(html).includes(FLOYD_PARKING), `${londonDay} prerender includes the parking text`);
    assert(html.includes('/images/sir-henry-floyd-lettings-map.jpg'), `${londonDay} prerender includes the site map`);
    assert(html.includes('Monday 16 November'), `${londonDay} prerender includes the session date`);
    assert(!html.includes('Temporary venue for the next 3 weeks'), `${londonDay} prerender omits the October ticker`);
  } else {
    assert(!html.includes('Sir Henry Floyd'), `${londonDay} prerender has no Floyd notice`);
    assert(!html.includes(FLOYD_MONDAY_TICKER), `${londonDay} prerender has no Monday ticker`);
    assert(!html.includes('54994'), `${londonDay} prerender has no 54994`);
  }

  const page = await browser.newPage();
  const logs: string[] = [];
  page.on('console', (message) => logs.push(`${message.type()}: ${message.text()}`));
  page.on('pageerror', (error) => logs.push(`pageerror: ${error.message}`));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    if (request.resourceType() === 'document' && pathname === '/location/aylesbury') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: html,
      });
      return;
    }
    await route.continue();
  });
  try {
    await page.goto(`${origin}/location/aylesbury`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('iframe[title="Hoop Heroes Booking Calendar"]', { timeout: 10000 });
    await page.waitForSelector('iframe[title="Location Map"]', { timeout: 10000 });
    const bookingSrc = await page.locator('iframe[title="Hoop Heroes Booking Calendar"]').getAttribute('src');
    const visibleText = (await page.locator('body').innerText()).toLowerCase();
    const hydration = logs.filter((line) => /hydrat|did not match|server rendered HTML|server HTML/i.test(line));
    assert(hydration.length === 0, `${londonDay} hydration warnings:\n${hydration.join('\n')}\nall logs:\n${logs.join('\n')}`);

    if (showing) {
      assert(visibleText.includes(FLOYD_MONDAY_TICKER.toLowerCase()), `${londonDay} render shows the ticker`);
      assert(visibleText.includes('17:45'), `${londonDay} render shows 17:45`);
      assert(visibleText.includes('18:15'), `${londonDay} render shows 18:15`);
      assert(visibleText.includes(FLOYD_MONDAY_RETURN.toLowerCase()), `${londonDay} render shows the return note`);
      assert(visibleText.includes(FLOYD_PARKING.toLowerCase()), `${londonDay} render shows the parking text`);
      assert(visibleText.includes('temporary venue: monday 16 november'), `${londonDay} render shows the heading`);
      assert(visibleText.includes('this monday only - starting 15 minutes later than usual'), `${londonDay} render shows the times note`);
      const floydMap = page.locator(`iframe[title="${FLOYD_MAP_TITLE}"]`);
      await floydMap.waitFor({ state: 'attached', timeout: 10000 });
      const mapSrc = await floydMap.getAttribute('src');
      assert(mapSrc?.includes('maps.google.com'), `${londonDay} Floyd map src ${mapSrc}`);
      assert(mapSrc?.includes(encodeURIComponent('Sir Henry Floyd Grammar School')), `${londonDay} map query is Sir Henry Floyd`);
      assert(await page.locator('img[src="/images/sir-henry-floyd-lettings-map.jpg"]').count() === 1, `${londonDay} shows the site map image`);
      assert(bookingSrc?.includes('54994'), `${londonDay} TeamUp filter missing 54994: ${bookingSrc}`);
      assert(bookingSrc?.includes('48411'), `${londonDay} TeamUp filter missing the base venues: ${bookingSrc}`);
      const rejectCookies = page.getByRole('button', { name: 'Reject Non-Essential' });
      if (await rejectCookies.count()) {
        await rejectCookies.click();
        await rejectCookies.waitFor({ state: 'hidden', timeout: 5000 });
      }
      await page.evaluate(() => {
        const ticker = document.querySelector('a[href="#temporary-venue"]');
        const card = document.getElementById('temporary-venue');
        if (!ticker || !card || !ticker.parentElement) return;
        const wrap = document.createElement('div');
        wrap.id = 'floyd-notice-shot';
        ticker.parentElement.insertBefore(wrap, ticker);
        wrap.append(ticker, card);
      });
      fs.mkdirSync('/opt/cursor/artifacts', { recursive: true });
      await page.locator('#floyd-notice-shot').screenshot({
        path: '/opt/cursor/artifacts/aylesbury_16_nov_floyd_notice.png',
      });
    } else {
      assert(!visibleText.includes(FLOYD_MONDAY_TICKER.toLowerCase()), `${londonDay} render hides the ticker`);
      assert(!visibleText.includes('sir henry floyd'), `${londonDay} render hides the Floyd notice`);
      assert(!visibleText.includes('monday 16 november'), `${londonDay} render hides the session date`);
      assert(await page.locator(`iframe[title="${FLOYD_MAP_TITLE}"]`).count() === 0, `${londonDay} has no Floyd map`);
      assert(!bookingSrc?.includes('54994'), `${londonDay} TeamUp filter still has 54994: ${bookingSrc}`);
      assert(bookingSrc?.includes('48411'), `${londonDay} TeamUp filter missing the base venues: ${bookingSrc}`);
    }
  } finally {
    await page.close();
  }
  console.log(`aylesbury ${londonDay} render ok`);
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
