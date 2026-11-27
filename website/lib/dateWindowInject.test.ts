import React from 'react';
import { renderToString } from 'react-dom/server';
import { CHRISTMAS_BREAK, LOCATIONS } from '../constants';
import { DateWindowOutlet } from '../components/DateWindows';
import { dateSlotMarker, injectServedHtml } from './dateWindowInject';
import { dateOnLondonDay, getActiveBannerNotices, getActiveScheduleNotices } from './venueNotice';
import type { LocationData } from '../types';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

const aylesbury = LOCATIONS.find((location) => location.slug === 'aylesbury');
const holmer = LOCATIONS.find((location) => location.slug === 'holmer-green');
if (!aylesbury || !holmer) throw new Error('missing locations');

const marker = dateSlotMarker('temporary-venues');
assert(marker.includes('hidden'), 'marker is hidden so it does not change layout');
assert(
  marker === renderToString(React.createElement(DateWindowOutlet, { slot: 'temporary-venues', location: aylesbury, londonDay: null })),
  'prerender outlet matches the marker the worker replaces',
);

const shell = `<!DOCTYPE html><html><head><title>t</title></head><body>${marker}${dateSlotMarker('banner-notices')}${dateSlotMarker('schedule-notices')}</body></html>`;
const inside = injectServedHtml(shell, { location: aylesbury, now: new Date('2026-11-05T12:00:00Z') });
assert(inside.includes('Sir Henry Floyd'), 'Aylesbury temporary venue is injected inside its window');
assert(inside.includes('window.__HH_LONDON_DATE__="2026-11-05"'), 'worker stamps the London day');
assert(!inside.includes('data-hh-date-slot="temporary-venues"'), 'filled slot is not left as a marker');
assert(!inside.includes('<iframe'), 'injected venue HTML does not include a map iframe');

const mondayOnly = injectServedHtml(shell, { location: aylesbury, now: dateOnLondonDay('2026-11-16') });
const mondayText = mondayOnly.replace(/<!--.*?-->/g, '');
assert(mondayOnly.includes('This Monday only (16 Nov): Sir Henry Floyd, 17:45 start - see details'), '16 Nov injects the Monday-only ticker');
assert(mondayOnly.includes('Monday 16 November'), '16 Nov injects the session date');
assert(mondayText.includes('Rookies (Age 5-7) 17:45'), '16 Nov injects the later Rookies time');
assert(mondayText.includes('Rising Stars (Age 8-11) 18:15'), '16 Nov injects the later Rising Stars time');
assert(mondayOnly.includes('Back at The Mandeville School as usual from Mon 23 Nov'), '16 Nov injects the return note');
assert(mondayOnly.includes('window.__HH_LONDON_DATE__="2026-11-16"'), '16 Nov stamps that London day');
assert(!mondayOnly.includes('Temporary venue for the next 3 weeks'), '16 Nov does not inject the October ticker');
assert(!mondayOnly.includes('data-hh-date-slot="temporary-venues"'), '16 Nov replaces the temporary-venue marker');

const outside = injectServedHtml(shell, { location: aylesbury, now: dateOnLondonDay('2026-11-20') });
assert(!outside.includes('Sir Henry Floyd'), 'Aylesbury temporary venue is omitted after both windows');
assert(!outside.includes('data-hh-date-slot='), 'expired slots are removed rather than left hidden');
assert(!outside.includes('54994'), '20 Nov injects no Sir Henry Floyd venue id');

const holmerTicker = 'Temporary venue on Tue 10, 17 and 24 Nov: Sir William Ramsay School - see details';
const holmerParking = 'Please use the main vehicle entrance off Rose Avenue. Park in the school car parks or the front layby, not the Community Centre car park.';
const holmerToday = injectServedHtml(shell, { location: holmer, now: dateOnLondonDay('2026-11-10') });
assert(holmerToday.includes(holmerTicker), 'Holmer Green ticker is injected on 10 Nov');
assert(holmerToday.includes('Tuesday 10 November'), '10 Nov is listed in the injected box');
assert(holmerToday.includes(holmerParking), 'parking guidance is injected on 10 Nov');
const holmerHtml = injectServedHtml(shell, { location: holmer, now: dateOnLondonDay('2026-11-17') });
assert(holmerHtml.includes(holmerTicker), 'Holmer Green ticker is injected on a date inside the window');
const holmerAfter = injectServedHtml(shell, { location: holmer, now: dateOnLondonDay('2026-11-25') });
assert(!holmerAfter.includes(holmerTicker), 'Holmer Green ticker is omitted after the window');
assert(!holmerAfter.includes(holmerParking), 'parking guidance is omitted after the window');

const makeup = 'Hall closed Sunday 20 December. Make-up session is on the following Sunday.';
const sandhurst = {
  ...LOCATIONS.find((location) => location.slug === 'sandhurst'),
  notices: [
    { text: makeup, showFrom: '2026-12-01', showUntil: '2026-12-20', placement: 'schedule' },
    { text: 'Car park closed for the banner test.', showFrom: '2026-12-01', showUntil: '2026-12-20' },
  ],
} as LocationData;

assert(getActiveScheduleNotices(sandhurst, dateOnLondonDay('2026-12-10')).length === 1, 'schedule placement is active inside the window');
assert(getActiveBannerNotices(sandhurst, dateOnLondonDay('2026-12-10')).length === 1, 'unset placement stays on the banner');
assert(getActiveScheduleNotices(sandhurst, dateOnLondonDay('2026-11-05')).length === 0, 'schedule notice is hidden before showFrom');

const noticed = injectServedHtml(shell, { location: sandhurst, now: dateOnLondonDay('2026-12-10') });
assert(noticed.includes(makeup), 'a schedule notice is injected from showFrom/showUntil');
assert(noticed.includes('Car park closed for the banner test.'), 'a banner notice is injected');
const noticedLater = injectServedHtml(shell, { location: sandhurst, now: dateOnLondonDay('2026-12-21') });
assert(!noticedLater.includes(makeup), 'the make-up line is not injected after showUntil');

const twice = injectServedHtml(inside, { location: aylesbury, now: new Date('2026-11-05T18:00:00Z') });
assert(twice.split('__HH_LONDON_DATE__').length === 2, 'the London date script is not duplicated');

const homeShell = `<!DOCTYPE html><html><head><title>t</title></head><body>${dateSlotMarker('christmas-closure')}</body></html>`;
const homeInside = injectServedHtml(homeShell, { now: dateOnLondonDay('2026-11-27') });
assert(homeInside.includes(CHRISTMAS_BREAK.text), 'homepage injects the Christmas sentence on 27 Nov');
assert(homeInside.includes('window.__HH_LONDON_DATE__="2026-11-27"'), 'homepage stamps 27 Nov');
assert(!homeInside.includes('data-hh-date-slot="christmas-closure"'), 'homepage replaces the Christmas marker');
assert(!homeInside.includes('Last class'), 'homepage inject does not add a venue line');
const homeLastDay = injectServedHtml(homeShell, { now: dateOnLondonDay('2027-01-03') });
assert(homeLastDay.includes(CHRISTMAS_BREAK.text), 'homepage still injects the sentence on 3 Jan 2027');
const homeHidden = injectServedHtml(homeShell, { now: dateOnLondonDay('2027-01-04') });
assert(!homeHidden.includes(CHRISTMAS_BREAK.text), 'homepage omits the sentence from 4 Jan 2027');
assert(!homeHidden.includes('data-hh-date-slot='), 'an ended Christmas slot is removed');
const homeBefore = injectServedHtml(homeShell, { now: dateOnLondonDay('2026-11-26') });
assert(!homeBefore.includes(CHRISTMAS_BREAK.text), 'homepage omits the sentence on 26 Nov 2026');

const closureShell = `${shell}${dateSlotMarker('christmas-closure')}`;
const aylesburyClosure = injectServedHtml(closureShell, { location: aylesbury, now: dateOnLondonDay('2026-11-27') });
assert(aylesburyClosure.includes(CHRISTMAS_BREAK.text), 'Aylesbury injects the Christmas sentence');
assert(aylesburyClosure.includes('>Last class<') && aylesburyClosure.includes('Mon 14 Dec'), 'Aylesbury injects its last class');
assert(aylesburyClosure.includes('>Back<') && aylesburyClosure.includes('Mon 4 Jan'), 'Aylesbury injects its return date');
const aylesburyClient = renderToString(
  React.createElement(DateWindowOutlet, { slot: 'christmas-closure', location: aylesbury, londonDay: '2026-11-27' }),
);
assert(
  injectServedHtml(dateSlotMarker('christmas-closure'), { location: aylesbury, now: dateOnLondonDay('2026-11-27') }).endsWith(aylesburyClient),
  'served Christmas notice matches the hydrated render',
);
const aylesburyClosed = injectServedHtml(closureShell, { location: aylesbury, now: dateOnLondonDay('2027-01-04') });
assert(!aylesburyClosed.includes(CHRISTMAS_BREAK.text) && !aylesburyClosed.includes('Mon 14 Dec'), 'Aylesbury drops the notice on 4 Jan 2027');

const sandhurstReal = LOCATIONS.find((location) => location.slug === 'sandhurst');
if (!sandhurstReal) throw new Error('missing sandhurst');
const sandhurstMakeup = 'Make-up session: Sunday 20 December, Rookies 15:00-15:30 and Rising Stars 15:30-16:15, same venue.';
const sandhurstDuring = injectServedHtml(closureShell, { location: sandhurstReal, now: dateOnLondonDay('2026-12-10') });
assert(sandhurstDuring.includes(CHRISTMAS_BREAK.text), 'Sandhurst shows the Christmas sentence on 10 Dec');
assert(sandhurstDuring.includes(sandhurstMakeup), 'Sandhurst keeps the make-up notice on 10 Dec');
assert(sandhurstDuring.includes('Sun 20 Dec') && sandhurstDuring.includes('Sun 10 Jan'), 'Sandhurst shows its own last class and return');
const sandhurstAfterMakeup = injectServedHtml(closureShell, { location: sandhurstReal, now: dateOnLondonDay('2026-12-21') });
assert(sandhurstAfterMakeup.includes(CHRISTMAS_BREAK.text), 'Sandhurst still shows the Christmas sentence on 21 Dec');
assert(!sandhurstAfterMakeup.includes(sandhurstMakeup), 'the make-up notice stays hidden from 21 Dec');
const sandhurstAfterBreak = injectServedHtml(closureShell, { location: sandhurstReal, now: dateOnLondonDay('2027-01-04') });
assert(!sandhurstAfterBreak.includes(CHRISTMAS_BREAK.text), 'Sandhurst hides the Christmas sentence on 4 Jan 2027');
assert(!sandhurstAfterBreak.includes(sandhurstMakeup), 'Sandhurst does not bring the make-up notice back');

console.log('date window inject tests passed');
