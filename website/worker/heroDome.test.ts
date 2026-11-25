import worker from './index.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

const SCHOOLS_KEY = 'pit-schools-DO-NOT-LEAK';
const SCHOOLS_LOCATION = 'schools-loc-123';
const MAIN_KEY = 'pit-main-should-not-be-used';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

interface TestEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  RESEND_API_KEY?: string;
  GHL_API_KEY?: string;
  GHL_SCHOOLS_API_KEY?: string;
  GHL_SCHOOLS_LOCATION_ID?: string;
  HERO_DOME_ENQUIRY_TO?: string;
  HERO_DOME_ENQUIRY_CC?: string;
}

let calls: Call[] = [];
const originalFetch = globalThis.fetch;

function installFetch(handler: (call: Call) => Response): void {
  calls = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries((init?.headers || {}) as Record<string, string>)) {
      headers[key.toLowerCase()] = value;
    }
    let body: unknown = init?.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // leave as text
      }
    }
    const call: Call = { url, method: (init?.method || 'GET').toUpperCase(), headers, body };
    calls.push(call);
    return handler(call);
  };
}

function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function okHandler(call: Call): Response {
  if (call.url.endsWith('/contacts/upsert')) return jsonResponse({ new: true, contact: { id: 'c9' } });
  if (call.url.includes('api.resend.com')) return jsonResponse({ id: 'email1' });
  return jsonResponse({ ok: true });
}

function fullEnv(extra: Partial<TestEnv> = {}): TestEnv {
  return {
    ASSETS: { fetch: async () => new Response('<html><head><title>x</title><meta name="description" content=""></head><body>hh-spa-shell</body></html>') },
    GHL_API_KEY: MAIN_KEY,
    GHL_SCHOOLS_API_KEY: SCHOOLS_KEY,
    GHL_SCHOOLS_LOCATION_ID: SCHOOLS_LOCATION,
    RESEND_API_KEY: 'resend-key',
    ...extra,
  };
}

function enquiry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Alex Morgan',
    role: 'Head teacher',
    organisation: 'Example Primary School',
    town: 'Aylesbury HP20',
    email: 'Alex@Example.org',
    phone: '07123 456789',
    site: 'Big playground <b>behind</b> the hall.',
    heardFrom: 'A Hoop Heroes family',
    consent: true,
    website: '',
    ...overrides,
  };
}

async function post(payload: unknown, testEnv: TestEnv): Promise<Response> {
  return worker.fetch(new Request('https://www.hoopheroes.co.uk/api/hero-dome-enquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  }), testEnv);
}

const byUrl = (part: string) => calls.filter((call) => call.url.includes(part));

async function testHappyPath(): Promise<void> {
  installFetch(okHandler);
  try {
    const response = await post(enquiry(), fullEnv());
    assertEqual(response.status, 200, 'happy path status');
    assertEqual(await response.json(), { success: true }, 'happy path body');

    const upserts = byUrl('/contacts/upsert');
    assertEqual(upserts.length, 1, 'one upsert');
    const upsert = upserts[0];
    assertEqual(upsert.headers.authorization, `Bearer ${SCHOOLS_KEY}`, 'upsert uses the Schools key');
    assertEqual(upsert.headers.version, '2021-07-28', 'v2 version header');
    const body = upsert.body as Record<string, unknown>;
    assertEqual(body.locationId, SCHOOLS_LOCATION, 'upsert goes to the Schools location');
    assertEqual(body.email, 'alex@example.org', 'email lower-cased');
    assertEqual(body.phone, '+447123456789', 'phone normalised');
    assertEqual(body.companyName, 'Example Primary School', 'organisation as company name');
    assertEqual(body.firstName, 'Alex', 'first name');
    assert(!('tags' in body), 'upsert carries no tags (added afterwards)');
    assert(!calls.some((call) => call.headers.authorization === `Bearer ${MAIN_KEY}`), 'main GHL key never used');

    const tags = byUrl('/contacts/c9/tags');
    assertEqual(tags.length, 1, 'tags added once');
    assertEqual(tags[0].body, { tags: ['hero-dome', 'hero-dome-enquiry'] }, 'Hero Dome tags');

    const notes = byUrl('/contacts/c9/notes');
    assertEqual(notes.length, 1, 'note added once');
    const note = (notes[0].body as { body: string }).body;
    assert(note.includes('Role: Head teacher'), 'note has the role');
    assert(note.includes('Town or postcode: Aylesbury HP20'), 'note has the town');

    const emails = byUrl('api.resend.com');
    assertEqual(emails.length, 1, 'one email');
    const email = emails[0].body as Record<string, unknown>;
    assertEqual(email.to, ['christie@hoopheroes.co.uk'], 'email to Christie');
    assertEqual(email.cc, ['jamie@hoopheroes.co.uk'], 'Jamie copied');
    assertEqual(email.reply_to, 'alex@example.org', 'reply-to is the enquirer');
    assert(String(email.subject).includes('Example Primary School'), 'subject names the organisation');
    const html = String(email.html);
    assert(html.includes('&lt;b&gt;behind&lt;/b&gt;'), 'free text is escaped in the email');
    assert(!html.includes('<b>behind</b>'), 'raw HTML from the form is not in the email');
  } finally {
    restoreFetch();
  }
}

async function testHoneypot(): Promise<void> {
  installFetch(okHandler);
  try {
    const response = await post(enquiry({ website: 'http://spam.example' }), fullEnv());
    assertEqual(response.status, 200, 'honeypot looks successful');
    assertEqual(calls.length, 0, 'honeypot sends nothing');
  } finally {
    restoreFetch();
  }
}

async function testValidation(): Promise<void> {
  installFetch(okHandler);
  try {
    const cases: [Record<string, unknown>, string][] = [
      [{ name: '' }, 'missing name'],
      [{ role: 'Wizard' }, 'unknown role'],
      [{ organisation: '  ' }, 'missing organisation'],
      [{ town: '' }, 'missing town'],
      [{ email: 'not-an-email' }, 'bad email'],
      [{ consent: false }, 'no consent'],
      [{ consent: 'true' }, 'consent must be a real tick'],
    ];
    for (const [overrides, label] of cases) {
      const response = await post(enquiry(overrides), fullEnv());
      assertEqual(response.status, 400, `${label} is rejected`);
      const data = await response.json() as { error?: string };
      assert(typeof data.error === 'string' && data.error.length > 0, `${label} has a message`);
    }
    const bad = await post('{not json', fullEnv());
    assertEqual(bad.status, 400, 'invalid JSON is rejected');
    assertEqual(calls.length, 0, 'invalid enquiries send nothing');
  } finally {
    restoreFetch();
  }
}

async function testEmailOnlyUntilSchoolsAccountExists(): Promise<void> {
  installFetch(okHandler);
  try {
    const response = await post(enquiry(), fullEnv({ GHL_SCHOOLS_API_KEY: undefined, GHL_SCHOOLS_LOCATION_ID: undefined }));
    assertEqual(response.status, 200, 'email alone is enough');
    assertEqual(byUrl('leadconnectorhq').length, 0, 'no GHL calls without the Schools account');
    assertEqual(byUrl('api.resend.com').length, 1, 'email still sent');
  } finally {
    restoreFetch();
  }
}

async function testGhlOnlyWhenNoEmailKey(): Promise<void> {
  installFetch(okHandler);
  try {
    const response = await post(enquiry(), fullEnv({ RESEND_API_KEY: undefined }));
    assertEqual(response.status, 200, 'GHL alone is enough');
    assertEqual(byUrl('api.resend.com').length, 0, 'no email without a Resend key');
  } finally {
    restoreFetch();
  }
}

async function testNothingConfigured(): Promise<void> {
  installFetch(okHandler);
  try {
    const response = await post(enquiry(), fullEnv({
      GHL_SCHOOLS_API_KEY: undefined,
      GHL_SCHOOLS_LOCATION_ID: undefined,
      RESEND_API_KEY: undefined,
    }));
    assertEqual(response.status, 500, 'nothing configured is a configuration error');
    assertEqual(calls.length, 0, 'nothing sent');
  } finally {
    restoreFetch();
  }
}

async function testOneChannelFailingStillSucceeds(): Promise<void> {
  installFetch((call) => (call.url.includes('api.resend.com') ? new Response('down', { status: 500 }) : okHandler(call)));
  try {
    const response = await post(enquiry(), fullEnv());
    assertEqual(response.status, 200, 'GHL success carries a failed email');
  } finally {
    restoreFetch();
  }
  installFetch((call) => (call.url.includes('leadconnectorhq') ? new Response('down', { status: 500 }) : okHandler(call)));
  try {
    const response = await post(enquiry(), fullEnv());
    assertEqual(response.status, 200, 'email success carries a failed GHL upsert');
  } finally {
    restoreFetch();
  }
}

async function testBothChannelsFailing(): Promise<void> {
  installFetch(() => new Response('down', { status: 500 }));
  try {
    const response = await post(enquiry(), fullEnv());
    assertEqual(response.status, 502, 'both failing is an error');
    const data = await response.json() as { error?: string };
    assert(String(data.error).includes('christie@hoopheroes.co.uk'), 'error offers an email fallback');
  } finally {
    restoreFetch();
  }
}

async function testRecipientOverrides(): Promise<void> {
  installFetch(okHandler);
  try {
    await post(enquiry(), fullEnv({ HERO_DOME_ENQUIRY_TO: 'schools@hoopheroes.co.uk', HERO_DOME_ENQUIRY_CC: '' }));
    const email = byUrl('api.resend.com')[0].body as Record<string, unknown>;
    assertEqual(email.to, ['schools@hoopheroes.co.uk'], 'to override');
    assert(!('cc' in email), 'empty cc override drops the copy');
  } finally {
    restoreFetch();
  }
}

async function testOtherRole(): Promise<void> {
  installFetch(okHandler);
  try {
    await post(enquiry({ role: 'Other', roleOther: 'Trust estates lead' }), fullEnv());
    const note = (byUrl('/notes')[0].body as { body: string }).body;
    assert(note.includes('Role: Other: Trust estates lead'), 'other role text kept');
  } finally {
    restoreFetch();
  }
}

async function testPageIsNoindexAndHealthHidesKeys(): Promise<void> {
  // HTMLRewriter is a Workers runtime built-in. A pass-through stub is enough to check headers.
  (globalThis as Record<string, unknown>).HTMLRewriter ??= class {
    on() { return this; }
    transform(response: Response) { return response; }
  };
  const page = await worker.fetch(new Request('https://www.hoopheroes.co.uk/hero-dome'), fullEnv());
  assertEqual(page.status, 200, '/hero-dome is a real page');
  assertEqual(page.headers.get('X-Robots-Tag'), 'noindex', '/hero-dome is kept out of search');

  const home = await worker.fetch(new Request('https://www.hoopheroes.co.uk/'), fullEnv());
  assert(home.headers.get('X-Robots-Tag') !== 'noindex', 'home page stays indexable');

  const health = await worker.fetch(new Request('https://www.hoopheroes.co.uk/api/health'), fullEnv());
  const text = await health.text();
  assertEqual((JSON.parse(text) as Record<string, unknown>).heroDomeGhlConfigured, true, 'health reports the Schools account');
  assert(!text.includes(SCHOOLS_KEY) && !text.includes('DO-NOT-LEAK'), 'health hides the Schools key');
}

await testHappyPath();
await testHoneypot();
await testValidation();
await testEmailOnlyUntilSchoolsAccountExists();
await testGhlOnlyWhenNoEmailKey();
await testNothingConfigured();
await testOneChannelFailingStillSucceeds();
await testBothChannelsFailing();
await testRecipientOverrides();
await testOtherRole();
await testPageIsNoindexAndHealthHidesKeys();
console.log('heroDome.test.ts: all passed');
