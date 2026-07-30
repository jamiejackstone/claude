# claude-config

Canonical copies of Jamie's personal Claude configuration, version-controlled here so
there's always a source of truth (the live copies live in `~/.claude/` on each session's
container, which is ephemeral).

| File | Where it goes | What it does |
|---|---|---|
| `settings.json` | `~/.claude/settings.json` (user-level) | Read-only permission allowlist — auto-approves safe reads (KB, Asana, Calendar, files) while every write / send / delete still prompts for approval. |
| `../CLAUDE.md` | `~/.claude/CLAUDE.md` (user-level) | Standing context: who Jamie is, how Hoop Heroes works, house rules. |

## Applying these to persist across all sessions

The `~/.claude/` copies made in a session container do **not** sync back to the account,
so to make them permanent, set them as your **user-level** config in Claude settings
(the same store your skills sync from). Paste the contents of each file into the matching
user-level file.

## The permission model

`settings.json` only ever **allows reads**. It contains no write, send, delete, or post
rules — those deliberately keep prompting, matching the "show me before anything
outward-facing" rule. To add a new safe read later, append its tool name to
`permissions.allow`. Never add a `*_send`, `create_*`, `update_*`, `delete_*`, or
`execute_*` tool here.
