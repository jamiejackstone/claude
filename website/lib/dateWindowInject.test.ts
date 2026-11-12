import React from 'react';
import { renderToString } from 'react-dom/server';
import { LOCATIONS } from '../constants';
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

console.log('date window inject tests passed');
