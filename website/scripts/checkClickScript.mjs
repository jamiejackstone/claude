import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function assert(condition, label) {
  if (!condition) throw new Error(label);
}

assert(html.includes("var name = 'hh_click_ids='"), 'page script reads the hh_click_ids cookie');
assert(html.includes("var keys = ['gclid', 'gbraid', 'wbraid']"), 'page script restores each click id');
assert(
  html.indexOf('hh_click_ids=') < html.indexOf('external-tracking.js'),
  'cookie restore runs before the LeadConnector tracking script',
);
console.log('click script check passed');
