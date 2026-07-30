---
name: world-cup-roundup
description: Research and send Jamie's daily FIFA World Cup predictor league roundup email to Hannah Stone via the Zapier Gmail connector. Use this whenever Jamie asks for "today's roundup", "the World Cup email", "today's update", "yesterday's results" for the predictor league, or similar — including on Mondays where it covers Friday, Saturday and Sunday's matches. Trigger this even if Jamie just says something like "send today's email" or "do the roundup" without mentioning the World Cup by name, since this is a standing daily habit during the tournament. Always send the email directly (never just draft it) unless Jamie explicitly says otherwise for that one instance.
---

# FIFA World Cup Daily Roundup

Researches the previous day's FIFA World Cup match results (or the full Friday–Sunday weekend on Mondays) and sends a fun, banter-filled roundup email straight to Hannah Stone via the Zapier Gmail connector for Jamie's work predictor league.

## When this runs

- **Tuesday–Friday mornings**: covers the previous single day's matches (e.g. on Wednesday, cover Tuesday's matches).
- **Monday mornings**: covers the full weekend — Friday, Saturday AND Sunday's matches, grouped under day headings.
- **No emails on Saturday or Sunday** — the league is for Mon–Fri office colleagues, so weekends are skipped. If Jamie asks for something on a Sat/Sun, that's a one-off and doesn't need the recurring weekday framing.
- Sent around 07:00 GMT once all matches from the relevant period have finished. If Jamie asks for "today's roundup" earlier in the day before all matches are finished, check kick-off times first — some games (especially late US kick-offs) may still be in progress. Cover the games that have finished; don't guess scores for ones still playing.

## Step-by-step process

1. **Work out which matches to cover.** Identify today's date and the day of the week.
   - Mon–Fri (single day): cover yesterday's matches.
   - Monday: cover Friday + Saturday + Sunday (three days, grouped).
2. **Research results with web_search.** Search for specific date + team/match queries (e.g. "FIFA World Cup results [date] [team names] scores goals"). Run enough searches to confirm every score AND get accurate scorer/minute detail for each match — don't rely on a single ambiguous source. Cross-check scores if sources disagree.
3. **Research tonight's fixtures.** Search for the next day's matches and UK kick-off times (BST/GMT as appropriate) for the "Tonight's Fixtures" section.
4. **Write the email** following the format and tone rules below.
5. **Send directly via the Zapier Gmail connector** (`Zapier:gmail_send_email`, `body_type: html`) to **hannah.stone@globalpayments.com**. Do not draft or preview first — send immediately, this is the established default. Only deviate if Jamie explicitly asks to see it first for that specific instance.
6. Confirm to Jamie that it's sent, with a short natural-language summary of the headline results (using citations for anything sourced from search).

## Tone and style rules

- Fun, banter-filled, lively — written like an enthusiastic colleague hyping up the day's football, not a news wire.
- **Never offensive or political.** No real-world politics, no national/ethnic stereotyping, nothing that could land badly in a mixed office Slack/email thread. Banter should be about football (misses, dramatic moments, bad defending) not about nationality or background.
- **Always call it "the FIFA World Cup"** — never "World Cup 2026" or just "World Cup".
- Sign off every email as **"J x"**.
- Keep each match synopsis **short — 2–3 lines maximum**. Score, one standout moment/player, one banter line. Resist the urge to write a full match report.
- Always include a **🏆 Star of the match** line where there's a standout performer worth highlighting (optional if the game has no obvious one).

## Email structure (in order)

1. **Casual opener** — one or two lines setting up the day/weekend (e.g. "Big day for the favourites" or "What an absolute weekend").
2. **Title header**: `🌍⚽ FIFA WORLD CUP DAILY ROUNDUP — [Day, Date] ⚽🌍` (or "WEEKEND ROUNDUP (Fri DD – Sun DD Month)" on Mondays).
3. **Match-by-match synopses.** On Mondays, group under clear day sub-headings (`📅 FRIDAY DD MONTH`, `📅 SATURDAY DD MONTH`, `📅 SUNDAY DD MONTH`) with each day's matches listed underneath. On other days, just list the matches directly under the main header — no day sub-headings needed for a single day.
   - Format each match heading as: `[flag emoji] Team A X–Y Team B [flag emoji] | Group X` (use an HTML `<h3>` with a divider/pipe between teams and group).
4. **⏳ Tonight's Fixtures** section — always include this. List the next day's (or, on a Monday roundup, Monday night's) matches with kick-off times in UK time (BST/GMT) and a one-line hook for each.
5. **📊 Predictor Check-In** — a short bulleted list reacting to predictor outcomes (e.g. "✅ Had X winning — nice one", "😬 Had Y winning easily — didn't happen", "🤯 Predicted that exact scoreline — teach us your secrets"). 3–5 bullets.
6. **💬 Big Question of the Day/Weekend** — one engaging, open-ended question to spark conversation among colleagues, tied to something notable from the matches covered.
7. **Sign-off**: `J x`

## Formatting notes

- Output is HTML (`body_type: html`), using `<h2>`/`<h3>` headers, `<p>` paragraphs, `<ul>`/`<li>` for bulleted sections, `<hr/>` dividers between sections, and flag emoji throughout.
- Subject line format: `⚽ FIFA World Cup Daily Roundup — [Day, Date]` or `⚽ FIFA World Cup Weekend Roundup — Friday DD to Sunday DD Month` on Mondays.
- Recipient is always **hannah.stone@globalpayments.com** — no need to search for this, it's confirmed.

## Common pitfalls to avoid

- Don't skip the "Tonight's Fixtures" section — it's been flagged before as something that must always be included.
- Don't write long match reports — keep synopses to 2–3 lines each, even when a match was especially dramatic. Save the colour for the one-liner, not a play-by-play.
- Don't call it "World Cup 2026" anywhere in the copy.
- Don't draft/preview unless explicitly asked for that one instance — the default is to send straight away.
- Don't guess or assume scores — always verify via web_search before writing, and don't include matches that haven't finished yet.
