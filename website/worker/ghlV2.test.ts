import worker from './index.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

const KEY = 'pit-9f3c1e7a-DO-NOT-LEAK';
const HR_KEY = 'hr-pit-should-stay-on-v1';
const LOCATION_ID = '9p0wEiLpTaIe1FDTFFQI';
const CLICK_FIELDS = [
  { id: '9frYn0xCQ45lkz4R6q0e', key: 'hh_gclid', fieldValue: 'GCLID1' },
  { id: 'Vco6cxY4VKBWQ9FPB6rQ', key: 'gbraid', fieldValue: 'GBRAID1' },
  { id: 'fMkXv33gXAGUuHBDcber', key: 'wbraid', fieldValue: 'WBRAID1' },
];

const OXFORD_WEBHOOK =
  'https://services.leadconnectorhq.com/hooks/9p0wEiLpTaIe1FDTFFQI/webhook-trigger/13da14ad-a351-4367-b715-99d0fb131ed7';

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
  GHL_LOCATION_ID?: string;
  GHL_HR_WEBHOOK_URL?: string;
  GHL_HR_API_KEY?: string;
  GHL_CAREERS_WEBHOOK_URL?: string;
}

let calls: Call[] = [];
const originalFetch = globalThis.fetch;

function headerMap(headers: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key.toLowerCase()] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) out[key.toLowerCase()] = value;
    return out;
  }
  for (const [key, value] of Object.entries(headers)) out[key.toLowerCase()] = String(value);
  return out;
}

function installFetch(handler: (call: Call, index: number) => Response): void {
  calls = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    let body: unknown;
    if (typeof init?.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const call: Call = {
      url,
      method: (init?.method || 'GET').toUpperCase(),
      headers: headerMap(init?.headers),
      body,
    };
    calls.push(call);
    return handler(call, calls.length - 1);
  };
}

function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

function env(extra: Partial<TestEnv> = {}): TestEnv {
  return {
    ASSETS: { fetch: async () => new Response('ok') },
    ...extra,
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function lead(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Jamie Stone',
    email: 'Jamie@Example.com',
    phone: '07123 456789',
    locationName: 'Sandhurst',
    tags: ['Sandhurst', 'Sandhurst Waitlist', 'Source: Website Waitlist'],
    source: 'Website Waitlist - Sandhurst',
    gclid: 'GCLID1',
    gbraid: 'GBRAID1',
    wbraid: 'WBRAID1',
    ...overrides,
  };
}

async function post(path: string, payload: Record<string, unknown>, testEnv: TestEnv): Promise<Response> {
  const request = new Request(`https://www.hoopheroes.co.uk${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return worker.fetch(request, testEnv);
}

function assertV2Headers(call: Call, token: string): void {
  assertEqual(call.headers.authorization, `Bearer ${token}`, 'Authorization bearer token');
  assertEqual(call.headers.version, '2021-07-28', 'Version header is 2021-07-28');
  assertEqual(call.headers.accept, 'application/json', 'Accept application/json');
  assertEqual(call.headers['content-type'], 'application/json', 'Content-Type application/json');
  assert(!call.url.includes('rest.gohighlevel.com'), 'main location does not call API v1');
}

function assertClickFields(customFields: unknown): void {
  assertEqual(customFields, CLICK_FIELDS, 'customFields use id + fieldValue for the three click ids');
  const serialized = JSON.stringify(customFields);
  assert(!serialized.includes('"field_value"'), 'deprecated field_value key is not sent');
  assert(!serialized.includes('"key":"gclid"'), 'native contact.gclid key is not sent');
}

function upsertCalls(): Call[] {
  return calls.filter((call) => call.url === 'https://services.leadconnectorhq.com/contacts/upsert');
}

async function testUpsertShape(): Promise<void> {
  installFetch(() => jsonResponse({ new: true, contact: { id: 'c1' } }));
  try {
    const response = await post('/api/waitlist', lead(), env({ GHL_API_KEY: KEY }));
    assertEqual(response.status, 200, 'waitlist upsert returns 200');
    assertEqual(upsertCalls().length, 1, 'one upsert call');
    const call = upsertCalls()[0];
    assertEqual(call.method, 'POST', 'upsert is POST');
    assert(call.url.startsWith('https://services.leadconnectorhq.com'), 'v2 base URL');
    assertV2Headers(call, KEY);
    const body = call.body as Record<string, unknown>;
    assertEqual(body.locationId, LOCATION_ID, 'locationId in body');
    assertEqual(body.email, 'jamie@example.com', 'email is trimmed and lowercased');
    assertEqual(body.phone, '+447123456789', 'phone is normalized');
    assertEqual(body.name, 'Jamie Stone', 'name is kept');
    assertEqual(body.firstName, 'Jamie', 'first name mapping');
    assertEqual(body.lastName, 'Stone', 'last name mapping');
    assertEqual(body.source, 'Website Waitlist - Sandhurst', 'source is kept');
    assertEqual(body.tags, ['Sandhurst', 'Sandhurst Waitlist', 'Source: Website Waitlist'], 'tags are kept');
    assertClickFields(body.customFields);
    assert(!('customField' in body), 'v1 customField map is not sent');
    assert(!('locationName' in body), 'locationName is not sent on v2 upsert');
    assert(!('gclid' in body), 'native gclid property is not sent');
    const client = await response.json() as { success?: boolean };
    assertEqual(client.success, true, 'client success');
  } finally {
    restoreFetch();
  }
}

async function testLocationOverride(): Promise<void> {
  installFetch(() => jsonResponse({ new: true, contact: { id: 'c1' } }));
  try {
    await post('/api/waitlist', lead(), env({ GHL_API_KEY: KEY, GHL_LOCATION_ID: 'override-loc' }));
    const body = upsertCalls()[0].body as Record<string, unknown>;
    assertEqual(body.locationId, 'override-loc', 'GHL_LOCATION_ID overrides the default');
  } finally {
    restoreFetch();
  }
}

async function testClickIdRetry(status: 400 | 422): Promise<void> {
  installFetch((_call, index) => {
    if (index === 0) return jsonResponse({ message: 'bad custom field' }, status);
    return jsonResponse({ new: true, contact: { id: 'c1' } });
  });
  try {
    const response = await post('/api/waitlist', lead(), env({ GHL_API_KEY: KEY }));
    assertEqual(response.status, 200, `${status} retry still returns the lead`);
    const attempts = upsertCalls();
    assertEqual(attempts.length, 2, `${status} retries the upsert once`);
    assertClickFields((attempts[0].body as Record<string, unknown>).customFields);
    const second = attempts[1].body as Record<string, unknown>;
    assert(!('customFields' in second), `${status} retry drops customFields`);
    assert(!('customField' in second), `${status} retry does not send customField`);
    assertEqual(second.locationId, LOCATION_ID, 'retry still sends locationId');
    assertEqual(second.email, 'jamie@example.com', 'retry still sends email');
    assertEqual(second.phone, '+447123456789', 'retry still sends phone');
    assertEqual(second.tags, ['Sandhurst', 'Sandhurst Waitlist', 'Source: Website Waitlist'], 'retry still sends tags');
    const serialized = JSON.stringify(second);
    assert(!serialized.includes('9frYn0xCQ45lkz4R6q0e'), 'retry body has no hh_gclid id');
    assert(!serialized.includes('Vco6cxY4VKBWQ9FPB6rQ'), 'retry body has no gbraid id');
    assert(!serialized.includes('fMkXv33gXAGUuHBDcber'), 'retry body has no wbraid id');
  } finally {
    restoreFetch();
  }
}

async function testNoRetryOn500(): Promise<void> {
  installFetch(() => jsonResponse({ message: 'upstream' }, 500));
  try {
    const response = await post('/api/waitlist', lead(), env({ GHL_API_KEY: KEY }));
    assertEqual(response.status, 500, 'upstream 500 is returned');
    assertEqual(upsertCalls().length, 1, '500 does not retry');
  } finally {
    restoreFetch();
  }
}

async function testMissingKey(): Promise<void> {
  installFetch(() => jsonResponse({ ok: true }));
  const errors: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };
  try {
    const response = await post('/api/waitlist', lead(), env());
    assertEqual(response.status, 500, 'missing key is a 500 JSON error');
    const data = await response.json() as { error?: string; details?: string };
    assertEqual(data.error, 'CRM Configuration Error', 'missing key error');
    assert(String(data.details).includes('GHL_API_KEY is missing'), 'missing key details');
    assert(errors.some((args) => String(args[0]).includes('GHL_API_KEY is not configured')), 'missing key is logged');
    assertEqual(calls.length, 0, 'missing key does not call GHL');
    assert(!JSON.stringify(data).includes(KEY), 'missing-key error does not contain a key');
  } finally {
    console.error = original;
    restoreFetch();
  }
}

async function testMissingPhoneDoesNotThrow(): Promise<void> {
  installFetch(() => jsonResponse({ new: true, contact: { id: 'c1' } }));
  try {
    const payload = lead();
    delete payload.phone;
    const response = await post('/api/waitlist', payload, env({ GHL_API_KEY: KEY }));
    assertEqual(response.status, 200, 'missing phone does not 500');
    const body = upsertCalls()[0].body as Record<string, unknown>;
    assert(!('phone' in body), 'missing phone is omitted');
    assertEqual(body.email, 'jamie@example.com', 'email still sent without phone');
    const data = await response.json() as { error?: string };
    assert(data.error !== 'Internal server error', 'missing phone is not an internal error');
  } finally {
    restoreFetch();
  }
}

async function testHealth(): Promise<void> {
  const response = await worker.fetch(new Request('https://www.hoopheroes.co.uk/api/health'), env({
    GHL_API_KEY: KEY,
    RESEND_API_KEY: 'resend-secret-not-for-health',
  }));
  const text = await response.text();
  const data = JSON.parse(text) as Record<string, unknown>;
  assertEqual(data.status, 'ok', 'health status');
  assertEqual(data.ghlConfigured, true, 'existing ghlConfigured');
  assertEqual(data.ghlHrConfigured, false, 'existing ghlHrConfigured');
  assertEqual(data.resendConfigured, true, 'existing resendConfigured');
  assertEqual(data.ghlKeySet, true, 'ghlKeySet true when key present');
  assertEqual(data.ghlApiVersion, 'v2', 'ghlApiVersion');
  assertEqual(data.ghlLocationId, LOCATION_ID, 'default ghlLocationId');
  assert(!text.includes(KEY), 'health does not contain the API key');
  assert(!text.includes('9f3c1e7a'), 'health does not contain part of the API key');
  assert(!text.includes('DO-NOT-LEAK'), 'health does not contain part of the API key');
  assert(!text.includes('resend-secret-not-for-health'), 'health does not contain the resend key');

  const missing = await worker.fetch(new Request('https://www.hoopheroes.co.uk/api/health'), env());
  const missingData = await missing.json() as Record<string, unknown>;
  assertEqual(missingData.ghlKeySet, false, 'ghlKeySet false when key absent');
  assertEqual(missingData.ghlConfigured, false, 'ghlConfigured stays false');
  assertEqual(missingData.ghlApiVersion, 'v2', 'version is reported without a key');
  assertEqual(missingData.ghlLocationId, LOCATION_ID, 'location id is reported without a key');

  const overridden = await worker.fetch(
    new Request('https://www.hoopheroes.co.uk/api/health'),
    env({ GHL_API_KEY: KEY, GHL_LOCATION_ID: 'override-loc' }),
  );
  const overriddenText = await overridden.text();
  const overriddenData = JSON.parse(overriddenText) as Record<string, unknown>;
  assertEqual(overriddenData.ghlLocationId, 'override-loc', 'health reports the location override');
  assert(!overriddenText.includes(KEY), 'health override does not contain the API key');
}

async function testOxfordWebhookThenV2Stamp(): Promise<void> {
  installFetch((call) => {
    if (call.url === OXFORD_WEBHOOK) return new Response('ok', { status: 200 });
    if (call.url.includes('/contacts/search/duplicate')) return jsonResponse({ contact: { id: 'contact-123' } });
    return jsonResponse({ succeeded: true, contact: { id: 'contact-123' } });
  });
  try {
    const response = await post('/api/waitlist', lead({ locationName: 'Oxford' }), env({ GHL_API_KEY: KEY }));
    assertEqual(response.status, 200, 'oxford webhook succeeds');
    assertEqual(calls[0].url, OXFORD_WEBHOOK, 'oxford webhook URL is unchanged');
    assertEqual(calls[0].method, 'POST', 'oxford webhook is POST');
    const webhookBody = calls[0].body as Record<string, unknown>;
    assertEqual(webhookBody.locationName, 'Oxford', 'oxford webhook still sends locationName');
    assertEqual(webhookBody.email, 'jamie@example.com', 'oxford webhook email');
    assertEqual(webhookBody.phone, '+447123456789', 'oxford webhook phone');
    assert('customField' in webhookBody, 'oxford webhook payload is unchanged and still includes customField');
    assertClickFields(webhookBody.customFields);
    assert(!('locationId' in webhookBody), 'oxford webhook body does not gain locationId');

    const lookup = calls.find((call) => call.url.includes('/contacts/search/duplicate'));
    assert(lookup, 'oxford stamp looks up the contact');
    assertEqual(
      lookup?.url,
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${LOCATION_ID}&email=jamie%40example.com`,
      'duplicate search query',
    );
    assertEqual(lookup?.method, 'GET', 'duplicate search is GET');
    assertV2Headers(lookup as Call, KEY);

    const update = calls.find((call) => call.method === 'PUT');
    assert(update, 'oxford stamp updates the contact');
    assertEqual(update?.url, 'https://services.leadconnectorhq.com/contacts/contact-123', 'PUT /contacts/{id}');
    assertV2Headers(update as Call, KEY);
    const updateBody = update?.body as Record<string, unknown>;
    assertClickFields(updateBody.customFields);
    assert(!('customField' in updateBody), 'v2 stamp does not send the v1 customField map');
    assert(!calls.some((call) => call.url.includes('rest.gohighlevel.com')), 'oxford stamp does not use v1');
  } finally {
    restoreFetch();
  }
}

async function testOxfordStampDoesNotSendEmptyUpdate(): Promise<void> {
  installFetch((call) => {
    if (call.url === OXFORD_WEBHOOK) return new Response('ok', { status: 200 });
    if (call.url.includes('/contacts/search/duplicate')) return jsonResponse({ contact: { id: 'contact-123' } });
    return jsonResponse({ message: 'rejected' }, 422);
  });
  try {
    const response = await post('/api/waitlist', lead({ locationName: 'Oxford' }), env({ GHL_API_KEY: KEY }));
    const client = await response.json() as { success?: boolean; message?: string };
    assertEqual(response.status, 200, 'oxford webhook lead is kept when click-id stamp is rejected');
    assertEqual(client.success, true, 'oxford success flag');
    const updates = calls.filter((call) => call.method === 'PUT');
    assertEqual(updates.length, 1, 'stamp does not send an empty follow-up update');
    assertClickFields((updates[0].body as Record<string, unknown>).customFields);
  } finally {
    restoreFetch();
  }
}

async function testHrStaysOnV1(): Promise<void> {
  installFetch(() => jsonResponse({ contact: { id: 'hr1' } }));
  try {
    const response = await post('/api/contact', {
      type: 'careers',
      name: 'Ada Coach',
      email: 'Ada@Example.com',
      phone: '07111 222333',
      location: 'Oxford',
      about: 'I coach',
      role: 'Head Coach',
      gclid: 'GCLID1',
    }, env({ GHL_HR_API_KEY: HR_KEY }));
    assertEqual(response.status, 200, 'careers still delivers');
    assertEqual(calls.length, 1, 'careers API path is a single v1 create');
    assertEqual(calls[0].url, 'https://rest.gohighlevel.com/v1/contacts/', 'HR create stays on API v1');
    assertEqual(calls[0].method, 'POST', 'HR create is POST');
    assertEqual(calls[0].headers.authorization, `Bearer ${HR_KEY}`, 'HR uses GHL_HR_API_KEY');
    assert(!('version' in calls[0].headers), 'HR v1 request has no Version header');
    assert(!calls[0].url.includes('services.leadconnectorhq.com'), 'HR create does not use the v2 host');
  } finally {
    restoreFetch();
  }
}

await testUpsertShape();
await testLocationOverride();
await testClickIdRetry(400);
await testClickIdRetry(422);
await testNoRetryOn500();
await testMissingKey();
await testMissingPhoneDoesNotThrow();
await testHealth();
await testOxfordWebhookThenV2Stamp();
await testOxfordStampDoesNotSendEmptyUpdate();
await testHrStaysOnV1();

console.log('ghl v2 worker tests passed');
