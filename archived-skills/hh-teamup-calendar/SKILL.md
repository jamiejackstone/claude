---
name: hh-teamup-calendar
description: >-
  Check the live Hoop Heroes class timetable by reading the TeamUp-synced
  Google Calendar — a temporary bridge until the TeamUp MCP connector is
  built. Use this whenever Jamie asks what classes or sessions are on, where,
  when, or for which age groups — phrasings like "check the TeamUp calendar",
  "what classes are on today", "what's running on Saturday", "do we have
  sessions tomorrow", "what's on at Marlow this week", "which age groups run
  at Oxford", or any question about the scheduled class timetable. Be willing
  to trigger even when he doesn't say "TeamUp" or "calendar" but is plainly
  asking what sessions are scheduled. Do NOT use for bookings, attendance,
  register completeness, member numbers or who is actually attending (this
  calendar holds the timetable only, not booking data), and do NOT use to
  create, edit or delete classes (the feed is read-only).
---

# HH TeamUp Calendar

Read the Hoop Heroes class timetable straight from the TeamUp → Google Calendar
sync, and answer Jamie's "what's on" questions cleanly.

**This is a temporary bridge.** Once the TeamUp MCP connector is live, that
becomes the source of truth for class and booking data and this skill is
retired. Until then, this read-only calendar is the quickest way to see the
scheduled timetable.

## What this calendar is — and isn't

It is a one-way mirror of the TeamUp **schedule**: every scheduled class, its
venue, its age group, and its time. That's all it carries.

It does **not** carry bookings, attendance, register completeness, member
counts, or who is coming to a given session. For anything beyond "what classes
are scheduled, where, when, and which age group", that lives in TeamUp itself
(until the MCP lands) — say so rather than inventing numbers.

## The two rules that never bend

1. **Always force UK time.** The feed's own timezone is set to **UTC**, not
   Europe/London. Every `list_events` call must pass `timeZone: Europe/London`,
   and every time you report back must be UK local (GMT/BST). Never read or
   relay a raw UTC time. Be alert around the late-March / late-October clock
   change — if Google's returned offsets ever look an hour out, flag it rather
   than trusting them.
2. **Never write to it.** This calendar is read-only (`accessRole: reader`) and
   it's a sync mirror — edits wouldn't stick and could confuse the sync. Do not
   call `create_event`, `update_event` or `delete_event` on it. Class changes
   are made in TeamUp, never here.

## Workflow

### Step 1 — Resolve the calendar (live, every time)

Call `Google Calendar:list_calendars` and find the TeamUp class feed. Match on
the calendar's `summary` containing any of (case-insensitive): `goteamup`,
`teamup`, or `hoop heroes classes`. It will be an `@import.calendar.google.com`
or `@group.calendar.google.com` calendar.

- As of June 2026 it shows up under its raw feed URL
  (`http://goteamup.com/providers/schedule/6822945/...`) with the ID
  `245ff1t480r5kckp7hvvp9n0jm7766r3@import.calendar.google.com`. Treat that ID
  as a fallback hint only — **prefer the live match**, because Jamie may rename
  the calendar and a re-generated TeamUp feed would change the URL/ID.
- If **exactly one** calendar matches → use it.
- If **none** matches → tell Jamie the TeamUp class calendar isn't showing up;
  the sync may have been removed or broken. Don't fall back to his other
  calendars.
- If **more than one** matches → list them and ask which.

### Step 2 — Work out the window

Default to **today** if Jamie names no date. Resolve relative dates ("today",
"tomorrow", "Saturday", "this week", "next Tuesday") against the current date.
Build `startTime` and `endTime` as a full Europe/London day (or range), e.g.
today = `00:00:00+01:00` to `23:59:59+01:00` in summer (`+00:00` in winter).

### Step 3 — Pull the events

Call `Google Calendar:list_events` with:

| Field | Value |
|---|---|
| `calendarId` | the resolved calendar ID |
| `startTime` / `endTime` | the window from Step 2, in Europe/London |
| `timeZone` | `Europe/London` (never omit) |
| `orderBy` | `startTime` |
| `pageSize` | `50` (a busy weekend day can run ~12+ sessions; raise and page if needed) |

### Step 4 — Decode and present

Each event's `summary` is the class name, which encodes the age group. The
`location` carries the venue.

**Age groups:**

| Class | Ages |
|---|---|
| Rookies | 5–7 |
| Rising Stars | 8–11 |
| Ballers | 12–15 |

**Format the answer (Jamie's style — lead with the headline, then group):**

- Open with a one-line summary: e.g. *"12 sessions across 4 venues today."*
- Group by venue, using the short venue name pulled from the location (Wendover,
  Oxford, Marlow, Tring, etc. — not the full postal address).
- Under each venue, list the sessions as `Age group: start–end` in UK time.
- For a narrow question ("anything at Marlow tomorrow?", "what time are the
  Ballers on Sunday?"), just answer it in a sentence or two — don't dump the
  whole timetable.
- If the window has no classes (e.g. a quiet weekday), say so plainly.

## Worked example

**Jamie:** "check the teamup calendar — what's on today?"

Resolve the calendar live → pull today's events in Europe/London → present:

> 12 sessions across 4 venues today.
>
> **Wendover** — John Colet School
> - Rookies (5–7): 09:00–09:30
> - Rising Stars (8–11): 09:30–10:15
> - Ballers (12–15): 10:15–11:00
>
> **Oxford** — The Oxford Academy
> - Rookies (5–7): 09:30–10:00
> - …
>
> **Tring** — Tring Sports Centre
> - …

## Out of scope

- **Bookings, attendance, registers, member numbers** — not in this calendar.
  Until the TeamUp MCP connector exists, these need TeamUp directly.
- **Changing the timetable** — read-only; class changes happen in TeamUp.
- **Membership or sales questions** — that's the Membership & Sales seat, not a
  calendar lookup.
