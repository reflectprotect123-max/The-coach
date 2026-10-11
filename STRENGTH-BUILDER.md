# Athlete-aligned strength builder

Open a coach session, then select **Strength builder** (or **Continue strength
draft**). Saved drafts also have a **Continue editing** shortcut in the session
library. Edit the desktop
coach form on the left; select **Start Session** on the right to run the actual
athlete logger. **Restart preview with latest edits** discards preview logs and
loads the newest draft. Drafts persist in the coach's existing local storage.

The coach editor uses the athlete library's actual patch/add/remove/reorder and
superset functions, with light coach styling rather than the athlete editor UI.
It exposes session instructions, exercise names, sets, tracking columns, rest,
five difficulty targets, coaching notes, completion circuits, and exercise search.
The compiler, session model, logger, timer, demo load rule, and preview CSS are
unchanged athlete source, pinned to strengthside `6db0b96e`. See
`athlete-runtime/PROVENANCE.md`. The coach form is not a pixel-match claim against
a new reference screenshot; the phone is an isolated real athlete preview.

Conversion preserves the original coach template and stores the native draft as
`athleteTemplate`, with its catalog and conversion warnings. It maps supported
tracking types, sets, notes, rest, completion circuits, and superset grouping.
Coach reps/load/RIR targets are NOT treated as native targets: the live athlete
compiler defaults to 8 reps or 8–12 and the logger accepts athlete-entered load.
Conditioning blocks remain in the original template, outside strength preview.

This is local authoring and isolated preview only. Native drafts do not replace
legacy coach blocks, calendar assignments, or the Supabase publishing payload.
Preview logs never write to storage or backend. Later edits to legacy blocks do
not overwrite a saved native draft. Production publishing requires an explicit
adapter to the athlete's plan-snapshot contract; it is not implemented here.

Run `npm test`. For a real browser check against a local server:

```sh
CHROMIUM_PATH=/usr/bin/chromium BUILDER_BROWSER_URL=http://127.0.0.1:8091/coach.html node strength-builder.smoke.mjs
```

## Coach session library

Search matches both the original session title and any saved strength-draft title.
Select-all applies to visible results; bulk actions include any selected hidden
rows as reflected in the selection count. Duplication copies both original coach
blocks and strength drafts, with fresh template/block/superset IDs. Program-grid
"save as template" uses the same copy operation.

Deletion protects templates referenced by programs or assigned sessions. Unused
templates move to `templateTrash` in local coach storage. **Restore deleted
templates** restores them, including their strength drafts, even after reload.
These library actions do not publish, change athlete assignments, or remove any
Supabase records. Unknown historical creation dates display a dash.

Browser library regression:

```sh
CHROMIUM_PATH=/usr/bin/chromium COACH_BROWSER_URL=http://127.0.0.1:8091/coach.html node coach-template-library.smoke.mjs
```

## Calendar and program scheduling

The calendar's Add From Library drawer searches session and local draft titles,
allows changing the target date, and identifies already-scheduled sessions.
Team calendars require choosing a valid team member first. Assignments validate
athlete and date, remain unpublished, and survive reload. On success the calendar
moves to the chosen month and expands the selected date. Program-grid session
pickers also support search without losing input focus.

Both pickers explicitly label local strength drafts: assigning currently uses
the original coach session, not the unpublished native draft. Unsupported drawer
tabs are disabled rather than presented as working scheduling options.

```sh
CHROMIUM_PATH=/usr/bin/chromium COACH_BROWSER_URL=http://127.0.0.1:8091/coach.html node coach-calendar-library.smoke.mjs
```
