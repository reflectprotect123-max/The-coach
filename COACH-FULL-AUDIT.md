# Coach app audit

This report records the pre-cleanup audit snapshot. The later
[`repository cleanup`](REPOSITORY-CLEANUP.md) removed obsolete workspace assets
and updated test wiring; it did not fix the application findings below. Suite
counts and test-run observations in this audit refer to that earlier snapshot.

## Verdict

The coach is a locally functional prototype, not a complete production coach app.
There are **21 prioritized findings** below: reproducible defects, source-confirmed
defects, and coach/athlete integration blockers. There are also **10 unfinished
feature groups**. Passing smoke tests does not establish end-to-end readiness.

This audit changes no application code, builder behavior, backend data, migration,
deployment, or existing HTML deliverable. The builder remains paused.

### Scope and evidence

- Audited `/workspace/The-coach` current working tree, including its uncommitted
  implementation, not just the last Git commit.
- Checked the delivered `/workspace/shared/Hybrid-Coach-Sidebar.html` as well as
  the source app. Used fresh, isolated Chromium contexts and synthetic records;
  exploratory checks blocked external requests. No real invitations or publishing.
- Inspected navigation, login/account boot, home/review, roster/profile, teams,
  athlete/team calendars, program list/grid/settings/assignment, session editors,
  exercise/circuit/prescription libraries, nutrition, analytics and gym tools.
- Compared feature coverage with the supplied TrainHeroic master specification
  and its screenshot map. This is **not** a pixel-diff of all 301 screenshots.
  The user's new sidebar is intentional, not a parity defect.
- Inspected the current athlete `apps/athlete/plan-sync.js` contract in strengthside
  and the SQL migrations in both repositories. Live database configuration,
  grants, policies and applied migrations were **not** authenticated or verified.

Evidence levels: **Browser** = reproduced in isolated Chromium; **Domain** =
reproduced with in-memory domain functions; **Mock** = reproduced against a fake
backend; **Source** = confirmed in implementation, without a live integration test.
P1 = resolve before production use; P2 = resolve before declaring the app complete.

## P1 — security, data integrity, and core workflow

### A01. Different coach accounts share the same workspace

**Browser + Source.** `coach-loop.js:13,1404,1427`; `coach.html:701`.

All coaches use the single origin-local key `THE-coach-loop-v1`. Signing out only
clears `currentUserId`; signing in as another coach reuses the same athletes,
templates, teams, history and notes. In an isolated two-account simulation, coach
two saw coach one's renamed private template.

Reproduce: account one creates a template → sign out → account two signs in in
the same browser. Account-specific workspace loading does not occur.

Needed: authenticated user/organization-scoped storage and backend loading, with
an explicit separate demo workspace and safe handling of shared devices.

### A02. Local identity is not reconciled with real authentication/coach access

**Browser + Source.** `coach.html:701,725,1977,2075`.

The app accepts a persisted local coach account when Supabase has no session.
`ensureCoachAccount` assigns a coach role after any successful password sign-in,
without verifying a server coach membership. The boot comment says it handles a
wrong local user, but its condition leaves an existing *different* local coach
unchanged. There is no auth-change subscription in the coach shell.

Reproduce: load a persisted non-demo local coach with no server session; the
workspace opens. Inspect boot with coach A locally and Supabase user B: A remains.

Needed: explicit offline/demo access policy, real coach authorization, session
expiry handling and identity reconciliation. This does **not** prove an RLS
bypass; backend authorization still has to be tested independently.

### A03. Custom exercise names break HTML attributes

**Browser + Source.** `coach.html:1701`, exercise picker result markup.

JSON strings are placed directly inside a single-quoted inline `onclick`.
Selecting a legitimate name such as `Coach's Row` produces a truncated handler,
a JavaScript syntax error, and no selection. An inert test name containing a
quote and `data-audit-injected` produced that extra DOM attribute.

Reproduce: create an exercise named `Coach's Row` in the exercise library → search
for it in a session picker → select it.

Needed: DOM event handlers/data IDs instead of interpolated JavaScript. Attribute
injection is confirmed; this is also a potential DOM-XSS surface. No malicious
script or external exploit was run.

### A04. Two open tabs silently overwrite each other's work

**Browser + Source.** `coach-loop.js:1427`; global in-memory `S`.

Every save writes the entire state with no revision/conflict detection or storage
event reconciliation. Reproduced: tab one renames a session; an already-open tab
two saves a profile change; reloading tab one restores the old session name.

Needed: scoped state revisions and conflict handling, not blind whole-state writes.

### A05. Invalid stored data is silently replaced with demo data

**Browser + Source.** `coach-loop.js:1404`.

Parse errors and unsupported stored state fall through to `buildSeed`, then save
over the existing record. An invalid-JSON fixture was overwritten on reload with
the Dan demo state, without a corruption/recovery warning.

Needed: preserve the original raw record, offer recovery/export, validate/migrate
the schema, and never silently overwrite an unreadable workspace.

### A06. Deleting an earlier block can break prescription editing/navigation

**Browser + Source.** `coach.html:1380,1390,1399,1565`.

The active editor stores numeric block/exercise indices. Deleting a preceding
block shifts those indices, but `removeBlk` closes the editor only when deleting
the exact edited block. Reproduced: edit a prescription in block index 3 → delete
block 0 → navigate away. The app throws:
`Cannot set properties of undefined (setting 'logColumns')`.

Needed: stable block/exercise IDs and safe editor teardown before structural
changes. Audit preceding-exercise deletion and block-type changes too.

### A07. Calendar “Edit” edits the template, not the scheduled session

**Source + Domain.** `coach-views.js:442`; `coach-loop.js` session instantiation.

The calendar Edit action calls `openSession(s.templateId)`. Assigned sessions are
already cloned snapshots, so changing the template does not change that calendar
session. Future uses of the shared template can change instead. There is no
calendar-instance editor corresponding to the reference workflow.

Reproduce: schedule a session → Calendar → Edit → change instructions → reopen
the calendar preview. The scheduled instructions remain the old value.

Needed: separate template editing from scheduled-instance editing, with explicit
publish/freeze rules and a proper return-to-calendar workflow.

### A08. Strength drafts do not reach the current athlete plan contract

**Source; known paused integration.** `strength-builder.js`; `coach-views.js`
library pickers; `coach-cloud.js:112`; strengthside `apps/athlete/plan-sync.js:9`.

Native edits save to `athleteTemplate`. Scheduling and publishing use original
legacy coach blocks. Coach cloud writes `assigned_session/resolved_snapshot`;
the current athlete plan sync uses domain snapshots (`strength_side`, fallback
`strength`). No verified adapter joins those paths.

Needed later, when the athlete app is stable: one authoritative session model,
contract/version adapter, and real coach → athlete → completion → review tests.
This is an unfinished integration, not a newly introduced layout bug.

### A09. Cloud completion refresh does not retrieve actual performance

**Source.** `coach-cloud.js:238`.

The coach reads assignment IDs/state and marks a local session completed. It does
not retrieve performed sets, actual load/reps, readiness, duration or lift memory.
There is no corresponding real-results import in this coach path. The review and
analytics screens therefore cannot reliably represent current athlete cloud logs.

Needed: authenticated results ingestion and identity mapping, including completion
without invented values, units, supersets and late/offline log updates.

### A10. Local team membership does not satisfy cloud publishing permission

**Source; live RLS unverified.**
`supabase/migrations/20260827_coach_publish_assigned_session.sql:12`.

The migration authorizes coaches through server `team_athlete`/`team.coach_id`.
Roster and team membership changes are local-only. A local team does not create
that server relationship, and a genuine 1:1 athlete outside a server team has no
permission route in this helper. Entering a UUID does not establish permission.

Needed: server coach/athlete relationships, a defined 1:1 authorization path and
allowed/denied-account integration tests. Do not widen RLS to make the demo work.

### A11. In-progress cloud sessions are not protected like completed sessions

**Mock + Source.** `coach-cloud.js:112,208,238`.

Cloud operations exclude `completed`, but do not protect remote `in_progress`.
Refresh does not map remote in-progress state to local active state. Reproduced
against a fake backend: an in-progress row was successfully changed to unpublished
while local state was still scheduled. Live trigger/policy behavior may differ.

Needed: explicit remote state machine, atomic checks for active/in-progress work,
and race tests for start-in-progress, not just completion races.

### A12. Cloud update behavior conflicts with the athlete snapshot-freeze SQL

**Source; live behavior unverified.** `coach-cloud.js:112`; `coach-views.js:608`;
strengthside `supabase/migrations/20260820_strength_hardening.sql:125` and
`20260827_coach_publish_assigned_session.sql:49`.

The cloud update path replaces `resolved_snapshot` and `published_at` on an
existing published assignment. Publish All restamps the publication time. The
athlete migrations freeze both fields once a row leaves draft. Re-publishing or
changing bundled nutrition can therefore be rejected if those triggers are
applied. The cloud mocks do not model those constraints. The coach repository's
same-dated migration differs materially from the athlete repository's version.

Needed: reconcile migrations and republish/versioning semantics; test against the
real schema. Do not remove snapshot protections merely to pass an update.

## P2 — usability, reliability, and reporting

### A13. Legacy exercise search loses focus after one character

**Browser + Source.** `coach.html:1712`.

Typing `squat` normally in Choose exercise yielded only `s`; active focus became
BODY. Its input handler replaces the entire dialog without restoring focus.
Needed: update results in place or preserve focus/caret. Tests must use sequential
typing, not just programmatically filling an input.

### A14. Save failures are not handled consistently

**Browser + Source.** `coach-tools.js:92`; `coach-loop.js:1427`; many direct saves.

An injected quota error during Save profile threw an unhandled exception; the
status stayed empty, memory changed, and reload lost the edit. Most save paths
lack rollback/retry; “Saved locally” in the legacy builder is a static label.
The comment composer has better failure handling, but it is not shared generally.
Needed: transactional saves and visible saving/saved/failed state across screens.

### A15. Program selections disappear when searching

**Browser + Source.** `coach.html:984,1003`.

Program selections live only in DOM checkboxes. Select a program, then type in
Search programs: the rerender removes the selection, even if the row still matches.
Needed: explicit selected-ID state and clear visible/hidden selection semantics,
as already used by the session library.

### A16. Add week bypasses the 52-week limit

**Browser + Source.** `coach.html:1239`; `coach-loop.js:addProgramWeek`.

Settings validate 1–52 weeks, but Add week increments without a limit. A program
at 52 became 53. Needed: one shared validator for every mutation path.

### A17. Archived athletes still receive new team program assignments

**Domain + Source.** `coach-loop.js:797`.

Archiving intentionally preserves team membership/history, but assignment uses
all member IDs without checking athlete status. An archived-member fixture
received seven new sessions. Needed: skip inactive/pending members by default
and report skipped members; preserve past sessions and membership history.

### A18. Larger dashboard controls were not applied consistently

**Browser + Source.** `strength-builder.css:24,26,29`; calendar month controls.

Native builder move controls measured 26px high, delete 27px with 11px text;
prescription controls are specified at 38px/12px. Calendar month buttons measured
30px. Some legacy session superset checkboxes remain browser-small. These fall
short of the requested comfortable sizing, even though document-overflow checks
pass. Not every sub-44px control is automatically a WCAG failure.

Needed: shared control typography/targets for both editors and calendars, plus
review of content density. The sample session is about 4,126px tall at desktop
and the expanded mobile prescription page about 5,738px: not a pixel-parity claim,
but a sign that the important authoring controls are spread very far apart.

### A19. Accessible form labels and keyboard authoring remain incomplete

**Browser + Source.** `coach.html:1836`; `coach-views.js` dialogs.

Legacy instructions, block title/notes and other fields have adjacent labels but
no `for`/ID association or wrapping label. Reordering legacy blocks is drag-only,
with no up/down equivalent. Dialogs implement some focus containment, but do not
consistently restore opener focus or make the background inert. The native
editor's up/down controls show that keyboard alternatives are feasible.

Needed: meaningful accessible names, stable keyboard order, keyboard reordering,
modal background isolation and consistent close/focus behavior.

### A20. Lift-history set numbers are incorrect for partial logging

**Browser + Source.** `coach-tools.js:52`.

Rows are filtered to completed sets before generating `index + 1`. A fixture
with only the third set logged displayed Set 1. Needed: preserve original set
indices/IDs before filtering and test skipped/partial sets.

### A21. Completed recovery work is omitted from profile circuit history

**Browser + Source.** `coach-views.js:245`; `coach.html:addBlk`.

The builder creates recovery as `type: conditioning, recoverySession: true`.
The profile history filters only `text` and `recovery` types. A completed recovery
fixture showed “No circuit history.” Needed: normalize block kinds across builder,
logging, profile history and reports; also distinguish circuits from prep prose.

## Unfinished feature groups — separate from bugs

| ID | Area | What still needs implementation |
| --- | --- | --- |
| F01 | Backend workspace | Real roster/team/template/program persistence, server loading, organization scope, cross-device consistency and recovery; local changes are not server membership changes |
| F02 | Invitations/onboarding | Delivery, acceptance, account linking, pending→active lifecycle, resend/revoke; current action only saves an invited local row |
| F03 | Communication | Athlete/assistant messaging, coach-comment delivery, GIF attachments, notifications and notification preferences; current comment history is local and sidebar services are disabled |
| F04 | Team/organization administration | Secure joins/access codes, ownership transfer, logos, organization settings and assistant roles; currently absent/disabled or local substitutes |
| F05 | Program/library management | Program deletion, folders, parent calendars/subscriptions, actual usage information, real pagination and design settings; many controls are disabled/static. Program duplication shares templates and needs explicit edit-propagation semantics |
| F06 | Reusable circuits/prescriptions | Independent CRUD libraries, saved presets and apply-to-session workflow; current tabs only derive rows from existing coach templates |
| F07 | Exercise library/builder parity | Shared catalog between editors, configurable parameters, suggested swaps, points of performance/tags and richer scoring/metrics. Native custom catalog and legacy custom catalog are separate; the observed reference contains more metric/category options |
| F08 | Analytics | Real athlete results first, then distinct single/team reports, charts, working-max history and report selection. Performance/Lift History/Lift Progress share a table; both audience buttons run the same handler; Classic Reports jumps to Training Summary |
| F09 | Gym tools and recovery | Testing-sheet mobile publishing, sheet/benchmark removal, validated results and backup import/restore. Downloading a backup works; restoring it through the app does not |
| F10 | Production/package verification | Shared coach+athlete release bundle, authenticated RLS/SQL integration, production route smoke test, native build verification, load/performance testing, and full screenshot/state parity audit |

Nutrition has validated local targets and meal-day entry, but its delivery remains
bundled with legacy sessions. Independent current-athlete nutrition delivery is
not established by this audit. Billing/marketplace pages in the packet are not
automatically new scope; their inclusion requires a product decision.

## Screen-by-screen assessment

| Screen/workflow | Current assessment | Relevant findings |
| --- | --- | --- |
| Sign-in, sign-out, account boot | Offline/local shell works; production identity boundaries incomplete | A01, A02, A04, A05, F01 |
| Sidebar/navigation | Main routes work; unavailable services clearly disabled; editor deletion can break navigation | A06, A18, A19, F03 |
| Coach Home/review | Local filters, expansion, metrics and comments work; actual athlete result/comment roundtrip missing | A09, F03 |
| Athletes and profiles | Local search/archive/notes/invite rows work; server membership/linking not a full workflow | A01, A10, A17, A19, A21, F01–F02 |
| Teams/settings | Local CRUD/membership/settings work; secure membership and admin features missing | A10, A17, F04 |
| Athlete/team calendars | Local add/copy/repeat/preview work; instance editing and publication state need correction | A07–A12, A18 |
| Programs/grid/settings/assign | Local grid works; selections, week limits and archived assignments need correction | A15–A17, F05 |
| Legacy session builder | Can author locally; ordinary search and structural edits contain reproducible failures | A03, A06, A13–A14, A19 |
| Native strength builder | Local editor and isolated athlete preview work; draft is disconnected from coach assignments | A08, A18, F07 |
| Exercise library | Local metadata CRUD works; selecting quoted names breaks; shared/richer catalog missing | A03, F07 |
| Circuits/prescriptions | Derived lists, not independently authorable reusable libraries | F06 |
| Nutrition | Local validation/entry works; cloud delivery follows legacy assignment path | A08, A12, F01 |
| Analytics | Local reports work but partial-set numbering is wrong and cloud results are absent | A09, A20, F08 |
| Gym tools/spreadsheets | Local testing and timer work; publishing/removal/restore incomplete | A14, F09 |
| Settings/organization/support | Local name/export/sign-out work; organization/support services missing | A01–A02, A14, F03–F04, F09 |

## Tests and coverage limits

- `npm test`: all 23 invoked suites passed (22 coach suites plus strength builder).
  This default command does **not** enable the optional browser branches. It also
  does not run standalone `log-columns.smoke.mjs`, `exercise-search.smoke.mjs` or
  the desktop-shell smoke test.
- Separately ran `log-columns.smoke.mjs` and `exercise-search.smoke.mjs`: both
  passed. The desktop-shell test passed its static checks but could not complete
  its live HTTP fetch (`ECONNREFUSED` / `ENETUNREACH`). That is an environment/network
  failure, not evidence of a current production HTTP status or a successful shell.
- Explicit browser regression branches passed on source: layout, management,
  home review, completion/tools, calendar library, template library and strength
  builder. Layout tests cover ten widths 320–1920px for main routes; additional
  exploratory checks covered session/program/calendar/assignment at
  320/390/768/1024px.
- Delivered HTML browser branches passed for management, home review,
  completion/tools, calendar library and template library. Its layout and native
  builder branches had also passed in the immediately preceding layout check.
  Native builder
  preview editing/logging remains local and isolated; passing it does not verify
  athlete publishing.
- Exploratory failures above were deliberately tested using temporary fake data,
  multiple tabs, a quota-error injection, an invalid stored-record fixture and a
  mock cloud in-progress row. No user's actual data was damaged.
- No live Supabase account, migration execution, email delivery, production
  deployment, native compilation, full security penetration test or all-image
  pixel comparison. SQL discrepancies are source findings, not observed live
  database errors. Managed-browser policy prevented direct `file://` checks;
  delivered HTML was tested over local HTTP.

## Recommended order, with final builder work held

1. Fix security/data-loss defects A01–A06, A14 and authentication boundaries.
2. Fix non-builder semantics: scheduled-session editing, selections, assignment
   status rules, reports/history, accessible controls and failure feedback.
3. Finish the coach's backend workspace/membership/invitation model and reconcile
   migrations; test real allowed and denied accounts. This is necessary regardless
   of the final strength builder interface.
4. Complete the agreed non-builder screen groups; add regressions for every
   reproduced failure and broader empty/error/large-data states.
5. Once the athlete app is finalized, integrate the final builder and the complete
   coach→athlete→log→review contract. Only then certify the shared release and
   screenshot alignment. Do not package another “final” HTML before these gates.

The audit is a repair backlog, not authorization to deploy or alter production.
