# Coach screen implementation status

This is a local implementation checklist, not a claim of deployment or full
pixel parity. The strength builder is paused at the user's request.

## Current pass: roster, athlete profile, teams

Reference screens inspected: `174_athletes_roster.png`,
`187_athlete-profile_athlete-profile-exercises-tab.png`, and
`213_teams_teams-list.png` in the supplied TrainHeroic packet.

- Roster: search retains typing focus; Active/Invited/Archived are distinct;
  select-visible respects every current filter; selected rows are highlighted.
- Bulk removal changes local team membership only, preserving sessions.
- Archive/restore retains training history, memberships, and prior invite status.
- Visible roster export downloads CSV with escaped cells.
- Profile exercise search uses actual completed set rows. Results show latest
  logged performance/date, not invented personal records or scheduled targets.
- Profile completed circuits and local coach notes are displayed/persisted.
- Pending invitations validate email and prevent duplicate emails. No email is
  sent; the UI explicitly says this.
- Teams: name/focus search, create/cancel, member selection, and settings save.
  Blank/duplicate names are rejected; all difficulty choices reload correctly.
- Team bulk actions, secure access codes, ownership transfer, and logo uploads
  are not implemented. Related controls are disabled or labeled unavailable.
- Unknown team creation dates show a dash, not a fabricated reference date.
- Common chrome: restored visible navigation labels and compact vertical spacing;
  fixed mobile rail specificity so it does not occupy a whole viewport.
- Removed the page animation's transformed containing block so drawers cover the
  viewport; athlete profile header/tabs use the reference's dark styling.

Verified by domain tests, real-browser workflows with isolated local fixtures,
and the existing coach smoke suite. Visual references informed the existing
table/drawer layout; a full viewport-by-viewport pixel comparison is still due.
These roster/team operations are local coach state, not verified Supabase
membership or invitation operations.

## Remaining non-builder passes

### Home/feed and review pass

Inspected `012_home_feed-collapsed-cards.png` and
`241_review_expanded-card.png`. The metric icons/vertical arrangement were brought
closer to those references; full pixel parity remains unverified.

- Feed identity, team, 1:1, new-member, and date filters use one tested resolver.
  "Me" only matches explicitly linked athlete identities; an unlinked account
  gets an explanatory empty state.
- Metric tiles show recorded readiness/minutes/intensity, not a tonnage ratio
  labeled as intensity. Zero recorded values remain visible.
- Expanded review gives each superset member its own letter.
- Local coach comments append to a history, preserving the original single-note
  record on migration. Blank/oversized comments are rejected. Storage failures
  leave the composer open and roll back the attempted comment.
- Comment delivery and GIF attachments are not connected; the composer says
  local-only and does not imply an athlete message was sent.
- Needs Programming excludes archived and pending-invitation athletes.
- Browser checks cover expansion, filters, empty state, notes, persistence,
  failed-save recovery, and the mobile comment drawer.

| Screen group | Next work |
| --- | --- |
| Home/feed and review | Local behavior pass complete; screenshot parity and backend comment delivery remain |
| Athlete/team calendars | Manage/instructions controls, real session preview, clean copies/repeats, history protection, and failed-cloud-delete retention implemented |
| Program library/grid/settings | Search focus, visible selection/duplication, read-only preview, difficulty reload, and protected shortening implemented; folders/access codes unavailable |
| Exercise library | Search focus and local metadata editor implemented; safe video URL validation; built-in identity read-only |
| Nutrition | Non-negative validated overrides, zero preservation, appended same-date meals and saved-day review implemented; delivery remains session-bundled |
| Account/settings/invitations | Define/verify backend delivery, account, and access controls |
| Analytics and Gym Tools | Local report landing/readiness/lift history/summary and testing spreadsheets implemented; no engine working-max history or testing-sheet cloud publishing |
| Cross-screen quality | Browser/mobile and packaged asset checks implemented; complete pixel-parity audit and production deployment remain |

## Finalization pass

- Inspected reference analytics landing (249), Gym Tools landing (270), and
  spreadsheet editor (273). Report cards and testing-sheet workflows follow
  those reference structures; they are not certified pixel-identical.
- Coach profile name, local private backup download, and sign-out are available.
- Circuit/prescription tabs derive entries from existing coach templates; they
  do not imply an independent native-strength catalog or publication path.
- Coach rest timer is an additional local utility, not an athlete gym logger.
- Testing spreadsheets preserve local results across reloads, support athlete
  selection and benchmarks, duplicate sheets, and export formula-safe CSV.
- New drawers support Escape and keyboard focus containment. Mobile toolbar
  overflow was corrected during browser checks.
- APK asset synchronization now includes management/tools modules and the full
  native preview runtime. This verifies the web bundle, not a compiled APK.

See `RELEASE-READINESS.md` for exact production blockers and release boundaries.

## Regression commands

```sh
npm test
CHROMIUM_PATH=/usr/bin/chromium COACH_BROWSER_URL=http://127.0.0.1:8091/coach.html node coach-management.smoke.mjs
CHROMIUM_PATH=/usr/bin/chromium COACH_BROWSER_URL=http://127.0.0.1:8091/coach.html node coach-home-review.smoke.mjs
```
