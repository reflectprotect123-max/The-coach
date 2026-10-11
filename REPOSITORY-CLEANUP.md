# Coach repository cleanup

The current coach is `coach.html`, not the old athlete/workspace page.
This cleanup removes superseded implementation files without changing the coach
builder, cloud contract, migration, or audited behavior.

## Removed/replaced

| Path | Reason |
| --- | --- |
| Root `index.html` (old contents) | Obsolete athlete/workspace implementation, not loaded by the coach or packaged shells. Replaced with a small redirect/fallback link to `coach.html` so opening the repo root still works. |
| `reference/legacy-brain-coach/index.html` | Superseded static dashboard mockup, with no runtime or packaging consumers. |
| `coach-ai.js` | Only loaded by the retired workspace page; current coach has no AI intent integration or matching server endpoint in this repo. |
| `coach-ai.smoke.mjs` | Tests the removed, unused AI client and old page. Active coach tests are retained. |
| `strength-sync.js` | Disabled athlete adapter stub, neither loaded nor packaged by the current coach. Its old source-string-only test was removed. |

All removed content is recoverable from Git history, including the prior merged
commit `e2e83c7fb2e30749bf4f03d5e65517290f5b7406`. No history was rewritten.
No user data, uploaded packets, other repositories or production records were deleted.

## Kept deliberately

- `coach-sync.js`: legacy athlete compatibility implementation used by bridge,
  nutrition, identity and active/completed-session protection regression tests.
  It is not loaded by the current coach, and these tests are not proof that the
  current strengthside app receives coach sessions.
- `coach-cloud.js`, `coach-bridge.js`, `coach-nutrition.js`: current coach consumers
  and shared/legacy contract tests still use them. Migration discrepancies and
  final athlete integration remain audit work, not safe deletion candidates.
- `athlete-runtime/`, strength builder files and preview iframe: loaded by the
  coach's isolated preview and needed for paused builder work.
- `whoop.js`: supplies the Supabase authentication client to the current coach.
- Desktop/Capacitor/native bridge, icons, packaging scripts, and single-file HTML:
  supported build assets, not superseded just because a native release is unverified.
- Audit, status and release documents: current backlog/history, not obsolete code.

## Test changes

Removed assertions inspecting the retired athlete page. Retargeted exercise
search, block-type and log-column wiring checks to `coach.html`. Kept domain and
legacy bridge behavior assertions, including nutrition and active/completed
session merge guards. Migration tests now inspect this repo's own SQL rather
than a possible unrelated parent-tree migration.

`npm test` now also includes the standalone log-column and exercise-search checks.
The cleanup smoke test verifies root routing, absent obsolete modules, intact
local HTML dependencies, and optional browser root navigation.
