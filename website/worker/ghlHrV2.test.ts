import worker from './index.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

const HR_KEY = 'hr-pit-9f3c1e7a-DO-NOT-LEAK';
const MAIN_KEY = 'main-pit-should-stay-on-v1';
const HR_LOCATION_ID = 'zxMh9T37AzC9DytMDQGr';
const HR_WEBHOOK = 'https://example.test/hr-webhook';
const CLICK_FIELDS = [
  { id: '9frYn0xCQ45lkz4R6q0e', key: 'hh_gclid', fieldValue: 'GCLID1' },
  { id: 'Vco6cxY4VKBWQ9FPB6rQ', key: 'gbraid', fieldValue: 'GBRAID1' },
  { id: 'fMkXv33gXAGUuHBDcber', key: 'wbraid', fieldValue: 'WBRAID1' },
];
const ROLE_TAGS = ['coach', 'recruitment', 'head_coach', 'Head Coach'];

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

function application(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'careers',
    name: 'Ada Coach',
    email: 'Ada@Example.com',
    phone: '07111 222333',
    location: 'Oxford',
    about: 'I coach under-12s',
    role: 'Head Coach',
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
  assert(!call.url.includes('rest.gohighlevel.com'), 'HR path does not call API v1');
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

function tagCalls(): Call[] {
  return calls.filter((call) => call.url.includes('/tags'));
}

function assertNoSecrets(text: string): void {
  assert(!text.includes(HR_KEY), 'response does not contain the HR API key');
  assert(!text.includes('9f3c1e7a'), 'response does not contain part of the HR API key');
  assert(!text.includes('DO-NOT-LEAK'), 'response does not contain part of the HR API key');
  assert(!text.includes(MAIN_KEY), 'response does not contain the main API key');
}

async function testUpsertThenTags(): Promise<void> {
  installFetch(() => jsonResponse({ new: true, contact: { id: 'hr-contact-1' } }));
  try {
    const response = await post('/api/contact', application(), env({ GHL_HR_API_KEY: HR_KEY }));
    const text = await response.text();
    assertEqual(response.status, 200, 'careers upsert returns 200');
    assertEqual(JSON.parse(text).success, true, 'client success');
    assertNoSecrets(text);
    assertEqual(upsertCalls().length, 1, 'one upsert call');
    assertEqual(tagCalls().length, 1, 'one tag call after upsert');
    const upsert = upsertCalls()[0];
    assertEqual(upsert.method, 'POST', 'upsert is POST');
    assert(upsert.url.startsWith('https://services.leadconnectorhq.com'), 'v2 base URL');
    assertV2Headers(upsert, HR_KEY);
    const body = upsert.body as Record<string, unknown>;
    assertEqual(body.locationId, HR_LOCATION_ID, 'HR locationId in body');
    assertEqual(body.email, 'ada@example.com', 'email is trimmed and lowercased');
    assertEqual(body.phone, '+447111222333', 'phone is normalized');
    assertEqual(body.name, 'Ada Coach', 'name is kept');
    assertEqual(body.firstName, 'Ada', 'first name mapping');
    assertEqual(body.lastName, 'Coach', 'last name mapping');
    assertEqual(body.source, 'Website HR & Recruitment Form', 'source is kept');
    assertClickFields(body.customFields);
    assert(!('tags' in body), 'upsert body does not include tags');
    assert(!('customField' in body), 'v1 customField map is not sent');
    assert(!('notes' in body), 'notes are not sent without an HR custom-field id');
    assert(!('nearest_hh_location' in body), 'nearest_hh_location is not sent without an HR custom-field id');
    assert(!('role_applied' in body), 'role_applied is not sent without an HR custom-field id');
    assert(!('sub_account' in body), 'sub_account is not sent without an HR custom-field id');
    assert(!('gclid' in body), 'native gclid property is not sent');
    const tags = tagCalls()[0];
    assertEqual(tags.method, 'POST', 'tags are added with POST');
    assertEqual(tags.url, 'https://services.leadconnectorhq.com/contacts/hr-contact-1/tags', 'POST /contacts/{id}/tags');
    assertV2Headers(tags, HR_KEY);
    assertEqual(tags.body, { tags: ROLE_TAGS }, 'tag body is the careers tag list');
    assert(!calls.some((call) => call.url.includes('rest.gohighlevel.com')), 'HR create does not use API v1');
  } finally {
    restoreFetch();
  }
}

async function testContactIdFromContactsArray(): Promise<void> {
  installFetch(() => jsonResponse({ contacts: [{ id: 'from-list' }] }));
  try {
    const response = await post('/api/contact', application({ gclid: undefined, gbraid: undefined, wbraid: undefined }), env({ GHL_HR_API_KEY: HR_KEY }));
    assertEqual(response.status, 200, 'contacts[0].id still delivers');
    assertEqual(tagCalls()[0]?.url, 'https://services.leadconnectorhq.com/contacts/from-list/tags', 'tags use contacts[0].id');
    const body = upsertCalls()[0].body as Record<string, unknown>;
    assert(!('customFields' in body), 'no click ids means no customFields');
  } finally {
    restoreFetch();
  }
}

async function testTagFailureDoesNotFailApplication(): Promise<void> {
  installFetch((call) => {
    if (call.url.endsWith('/tags')) return jsonResponse({ message: 'tag rejected' }, 500);
    return jsonResponse({ contact: { id: 'hr-contact-1' } });
  });
  const errors: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };
  try {
    const response = await post('/api/contact', application(), env({ GHL_HR_API_KEY: HR_KEY }));
    const text = await response.text();
    assertEqual(response.status, 200, 'tag failure still returns 200');
    assertEqual(JSON.parse(text).success, true, 'tag failure still succeeds');
    assertNoSecrets(text);
    assertEqual(tagCalls().length, 1, 'tag call was attempted');
    assert(errors.some((args) => String(args[0]).includes('[HR] tag update failed')), 'tag failure is logged');
    assert(!JSON.stringify(errors).includes(HR_KEY), 'tag error log does not contain the API key');
  } finally {
    console.error = original;
    restoreFetch();
  }
}

async function testMissingContactIdSkipsTags(): Promise<void> {
  installFetch(() => jsonResponse({ new: true }));
  const warnings: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  try {
    const response = await post('/api/contact', application(), env({ GHL_HR_API_KEY: HR_KEY }));
    assertEqual(response.status, 200, 'upsert without an id still delivers');
    assertEqual(tagCalls().length, 0, 'tags are not called without a contact id');
    assert(warnings.some((args) => String(args[0]).includes('without a contact id')), 'missing contact id is logged');
  } finally {
    console.warn = original;
    restoreFetch();
  }
}

async function testClickIdRetry(status: 400 | 422): Promise<void> {
  installFetch((call) => {
    if (call.url.endsWith('/contacts/upsert') && upsertCalls().length === 1) {
      return jsonResponse({ message: 'bad custom field' }, status);
    }
    if (call.url.endsWith('/tags')) return jsonResponse({ tags: ROLE_TAGS });
    return jsonResponse({ contact: { id: 'hr-contact-1' } });
  });
  try {
    const response = await post('/api/contact', application(), env({ GHL_HR_API_KEY: HR_KEY }));
    assertEqual(response.status, 200, `${status} retry still returns the application`);
    const attempts = upsertCalls();
    assertEqual(attempts.length, 2, `${status} retries the upsert once`);
    assertClickFields((attempts[0].body as Record<string, unknown>).customFields);
    const second = attempts[1].body as Record<string, unknown>;
    assert(!('customFields' in second), `${status} retry drops customFields`);
    assert(!('customField' in second), `${status} retry does not send customField`);
    assert(!('tags' in second), `${status} retry still omits tags`);
    assertEqual(second.locationId, HR_LOCATION_ID, 'retry still sends locationId');
    assertEqual(second.email, 'ada@example.com', 'retry still sends email');
    assertEqual(tagCalls().length, 1, `${status} retry still adds tags`);
    assertEqual((tagCalls()[0].body as { tags: string[] }).tags, ROLE_TAGS, 'tags are unchanged after retry');
  } finally {
    restoreFetch();
  }
}

async function testNoRetryOn500(): Promise<void> {
  installFetch(() => jsonResponse({ message: 'upstream' }, 500));
  try {
    const response = await post('/api/contact', application(), env({ GHL_HR_API_KEY: HR_KEY }));
    const text = await response.text();
    assertEqual(response.status, 502, 'upstream 500 becomes 502');
    assertEqual(JSON.parse(text).error, 'Failed to submit to CRM', 'generic CRM error');
    assertNoSecrets(text);
    assertEqual(upsertCalls().length, 1, '500 does not retry');
    assertEqual(tagCalls().length, 0, 'failed upsert does not add tags');
  } finally {
    restoreFetch();
  }
}

async function testMissingPhoneOmitsField(): Promise<void> {
  installFetch(() => jsonResponse({ contact: { id: 'hr-contact-1' } }));
  try {
    const payload = application();
    delete payload.phone;
    const response = await post('/api/contact', payload, env({ GHL_HR_API_KEY: HR_KEY }));
    assertEqual(response.status, 200, 'missing phone does not 500');
    const body = upsertCalls()[0].body as Record<string, unknown>;
    assert(!('phone' in body), 'missing phone is omitted');
    assertEqual(body.email, 'ada@example.com', 'email still sent without phone');
  } finally {
    restoreFetch();
  }
}

async function testMissingConfig(): Promise<void> {
  installFetch(() => jsonResponse({ ok: true }));
  try {
    const response = await post('/api/contact', application(), env());
    const data = await response.json() as { error?: string; details?: string };
    assertEqual(response.status, 500, 'missing HR config is a 500');
    assertEqual(data.error, 'CRM Configuration Error', 'missing config error');
    assert(String(data.details).includes('GHL_HR_API_KEY'), 'missing config names the secret');
    assertEqual(calls.length, 0, 'missing config does not call GHL');
    assert(!JSON.stringify(data).includes(HR_KEY), 'missing-config error does not contain a key');
  } finally {
    restoreFetch();
  }
}

async function testHealth(): Promise<void> {
  const response = await worker.fetch(new Request('https://www.hoopheroes.co.uk/api/health'), env({
    GHL_HR_API_KEY: HR_KEY,
    GHL_API_KEY: MAIN_KEY,
    RESEND_API_KEY: 'resend-secret-not-for-health',
  }));
  const text = await response.text();
  const data = JSON.parse(text) as Record<string, unknown>;
  assertEqual(data.status, 'ok', 'health status');
  assertEqual(data.ghlConfigured, true, 'existing ghlConfigured');
  assertEqual(data.ghlHrConfigured, true, 'existing ghlHrConfigured');
  assertEqual(data.resendConfigured, true, 'existing resendConfigured');
  assertEqual(data.ghlHrKeySet, true, 'ghlHrKeySet true when key present');
  assertEqual(data.ghlHrApiVersion, 'v2', 'ghlHrApiVersion');
  assertNoSecrets(text);
  assert(!text.includes('resend-secret-not-for-health'), 'health does not contain the resend key');

  const missing = await worker.fetch(new Request('https://www.hoopheroes.co.uk/api/health'), env());
  const missingText = await missing.text();
  const missingData = JSON.parse(missingText) as Record<string, unknown>;
  assertEqual(missingData.ghlHrKeySet, false, 'ghlHrKeySet false when key absent');
  assertEqual(missingData.ghlHrConfigured, false, 'ghlHrConfigured stays false');
  assertEqual(missingData.ghlHrApiVersion, 'v2', 'version is reported without a key');
  assertNoSecrets(missingText);
}

async function testWebhookThenDuplicateSearchAndPut(): Promise<void> {
  installFetch((call) => {
    if (call.url === HR_WEBHOOK) return new Response('ok', { status: 200 });
    if (call.url.includes('/contacts/search/duplicate')) return jsonResponse({ contact: { id: 'contact-123' } });
    return jsonResponse({ contact: { id: 'contact-123' } });
  });
  try {
    const response = await post('/api/contact', application(), env({
      GHL_HR_WEBHOOK_URL: HR_WEBHOOK,
      GHL_HR_API_KEY: HR_KEY,
    }));
    assertEqual(response.status, 200, 'webhook application succeeds');
    assertEqual(calls[0].url, HR_WEBHOOK, 'webhook URL is unchanged');
    assertEqual(calls[0].method, 'POST', 'webhook is POST');
    const webhookBody = calls[0].body as Record<string, unknown>;
    assertEqual(webhookBody.tags, ROLE_TAGS, 'webhook payload still includes tags');
    assertEqual(webhookBody.notes, 'I coach under-12s', 'webhook payload still includes notes');
    assertEqual(webhookBody.nearest_hh_location, 'Oxford', 'webhook payload still includes location');
    assertEqual(webhookBody.role_applied, 'Head Coach', 'webhook payload still includes role');
    assertEqual(webhookBody.email, 'ada@example.com', 'webhook email');
    assert('customField' in webhookBody, 'webhook payload still includes the v1 customField map');
    assertClickFields(webhookBody.customFields);
    assert(!('locationId' in webhookBody), 'webhook body does not gain locationId');

    const lookup = calls.find((call) => call.url.includes('/contacts/search/duplicate'));
    assert(lookup, 'webhook stamp looks up the contact');
    assertEqual(
      lookup?.url,
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${HR_LOCATION_ID}&email=ada%40example.com`,
      'duplicate search query',
    );
    assertEqual(lookup?.method, 'GET', 'duplicate search is GET');
    assertV2Headers(lookup as Call, HR_KEY);

    const update = calls.find((call) => call.method === 'PUT');
    assert(update, 'webhook stamp updates the contact');
    assertEqual(update?.url, 'https://services.leadconnectorhq.com/contacts/contact-123', 'PUT /contacts/{id}');
    assertV2Headers(update as Call, HR_KEY);
    const updateBody = update?.body as Record<string, unknown>;
    assertClickFields(updateBody.customFields);
    assert(!('tags' in updateBody), 'click-id stamp does not send tags');
    assert(!('customField' in updateBody), 'v2 stamp does not send the v1 customField map');
    assertEqual(upsertCalls().length, 0, 'webhook path does not upsert');
    assertEqual(tagCalls().length, 0, 'webhook path does not add tags through the API');
    assert(!calls.some((call) => call.url.includes('rest.gohighlevel.com')), 'webhook stamp does not use v1');
  } finally {
    restoreFetch();
  }
}

async function testWebhookWithoutClickIdsSkipsStamp(): Promise<void> {
  installFetch(() => new Response('ok', { status: 200 }));
  try {
    const response = await post('/api/contact', application({
      gclid: undefined,
      gbraid: undefined,
      wbraid: undefined,
    }), env({ GHL_HR_API_KEY: HR_KEY, GHL_CAREERS_WEBHOOK_URL: HR_WEBHOOK }));
    assertEqual(response.status, 200, 'webhook without click ids succeeds');
    assertEqual(calls.length, 1, 'no lookup when there are no click ids');
    assertEqual(calls[0].url, HR_WEBHOOK, 'careers webhook alias is used');
  } finally {
    restoreFetch();
  }
}

async function testLookupFailureDoesNotFailApplication(): Promise<void> {
  installFetch((call) => {
    if (call.url === HR_WEBHOOK) return new Response('ok', { status: 200 });
    return jsonResponse({ message: 'missing' }, 404);
  });
  try {
    const response = await post('/api/contact', application(), env({
      GHL_HR_WEBHOOK_URL: HR_WEBHOOK,
      GHL_HR_API_KEY: HR_KEY,
    }));
    const client = await response.json() as { success?: boolean };
    assertEqual(response.status, 200, 'lookup failure keeps the application');
    assertEqual(client.success, true, 'lookup failure success flag');
    assertEqual(calls.filter((call) => call.method === 'PUT').length, 0, 'failed lookup does not PUT');
  } finally {
    restoreFetch();
  }
}

async function testStampRejectionDoesNotSendEmptyUpdate(): Promise<void> {
  installFetch((call) => {
    if (call.url === HR_WEBHOOK) return new Response('ok', { status: 200 });
    if (call.url.includes('/contacts/search/duplicate')) return jsonResponse({ contact: { id: 'contact-123' } });
    return jsonResponse({ message: 'rejected' }, 422);
  });
  try {
    const response = await post('/api/contact', application(), env({
      GHL_HR_WEBHOOK_URL: HR_WEBHOOK,
      GHL_HR_API_KEY: HR_KEY,
    }));
    assertEqual(response.status, 200, 'rejected click-id stamp keeps the application');
    const updates = calls.filter((call) => call.method === 'PUT');
    assertEqual(updates.length, 1, 'stamp does not send an empty follow-up update');
    assertClickFields((updates[0].body as Record<string, unknown>).customFields);
  } finally {
    restoreFetch();
  }
}

async function testFailedWebhookDoesNotCallV2(): Promise<void> {
  installFetch(() => new Response('no', { status: 500 }));
  try {
    const response = await post('/api/contact', application(), env({
      GHL_HR_WEBHOOK_URL: HR_WEBHOOK,
      GHL_HR_API_KEY: HR_KEY,
    }));
    assertEqual(response.status, 502, 'failed webhook is 502');
    assertEqual(calls.length, 1, 'failed webhook does not call the HR API');
    assertEqual(calls[0].url, HR_WEBHOOK, 'only the webhook was called');
  } finally {
    restoreFetch();
  }
}

// Main-location waitlist is still API v1 on this branch. Remove this test when
// rebasing onto the main-location v2 change (PR #5); that branch moves waitlist to v2.
async function testWaitlistStaysOnV1(): Promise<void> {
  installFetch(() => jsonResponse({ contact: { id: 'main-1' } }));
  try {
    const response = await post('/api/waitlist', {
      name: 'Jamie Stone',
      email: 'Jamie@Example.com',
      phone: '07123 456789',
      locationName: 'Sandhurst',
      tags: ['Sandhurst Waitlist'],
      source: 'Website Waitlist - Sandhurst',
    }, env({ GHL_API_KEY: MAIN_KEY, GHL_HR_API_KEY: HR_KEY }));
    assertEqual(response.status, 200, 'waitlist still delivers');
    assertEqual(calls.length, 1, 'waitlist is a single main-location call');
    assertEqual(calls[0].url, 'https://rest.gohighlevel.com/v1/contacts/', 'main location stays on API v1 in this branch');
    assertEqual(calls[0].headers.authorization, `Bearer ${MAIN_KEY}`, 'waitlist uses GHL_API_KEY');
    assert(!('version' in calls[0].headers), 'main-location v1 request has no Version header');
    assert(!calls.some((call) => call.url.includes(HR_KEY)), 'waitlist does not use the HR key');
  } finally {
    restoreFetch();
  }
}

await testUpsertThenTags();
await testContactIdFromContactsArray();
await testTagFailureDoesNotFailApplication();
await testMissingContactIdSkipsTags();
await testClickIdRetry(400);
await testClickIdRetry(422);
await testNoRetryOn500();
await testMissingPhoneOmitsField();
await testMissingConfig();
await testHealth();
await testWebhookThenDuplicateSearchAndPut();
await testWebhookWithoutClickIdsSkipsStamp();
await testLookupFailureDoesNotFailApplication();
await testStampRejectionDoesNotSendEmptyUpdate();
await testFailedWebhookDoesNotCallV2();
await testWaitlistStaysOnV1();

console.log('ghl HR v2 worker tests passed');
