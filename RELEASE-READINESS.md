# Coach release readiness

The local finalization pass is implemented. **The complete production project
is not finished or deployed, and 1:1 pixel parity has not been certified.**
The strength builder remains paused at the user's request.

## Verified locally

- Existing coach domain/bridge/cloud-mock smoke tests pass.
- Real Chromium workflows cover session library, athlete/team/program pickers,
  roster and team management, profiles, review comments, nutrition, local
  analytics, spreadsheet persistence, profile/backup, program settings/previews,
  and desktop/mobile layout checks.
- Calendar copies start with fresh, unlogged rows. Logged sessions cannot be
  deleted from the calendar. A failed cloud unpublish retains the local session.
- Cloud-mock tests verify completed-assignment protection (including completion
  during an update), correct persisted assignment IDs, and failed unpublishing.
- Program shortening validates whole weeks (1–52) and requires confirmation
  before removing occupied later weeks; assigned athlete sessions are retained.
- `scripts/sync-coach-apk.sh` copies all new modules and preview assets. The
  package smoke check validates local entrypoint dependencies. No Android APK
  or Windows installer has been compiled by this pass.

## Existing targets discovered, not requested again

- Supabase project: `orysjncrksmdfabpuftd` (`whoop.js`).
- Documented coach route: `https://thehybridsystem.netlify.app/coach.html`
  (`desktop/README.md`). Read-only request on 2026-10-10 returned **404**.
- The athlete deployment uses that same Netlify site
  (`strengthside/scripts/deploy-athlete.mjs`). It stages an athlete-only bundle.
  Do not replace the site with a standalone coach deploy or run that athlete-only
  deploy expecting it to include this coach app. Release must preserve both apps
  and the site's functions/configuration.
- Existing Git read access works. `NETLIFY_AUTH_TOKEN`,
  `SUPABASE_ACCESS_TOKEN`, and `SUPABASE_DB_PASSWORD` are absent from this
  execution environment; no secret bindings are configured in runtime metadata.

## Release gates

1. **Backend workflows:** roster/team changes, invitations, coach comments,
   assistant roles, access codes, logo uploads, and messaging are local-only or
   unavailable. They need authorized server operations, RLS, delivery services,
   and integration checks. Adding credentials alone does not implement these.
2. **Coach-to-athlete contract:** legacy coach publishing uses `assigned_session`.
   The current athlete strength runtime syncs `strength_side` plan snapshots.
   Native strength drafts are deliberately local-only until builder integration
   resumes. Verify coach publish → athlete open/log → coach review with real
   authorized accounts before claiming cross-app functionality.
3. **Supabase migration:** verify/apply the repository's
   `20260827_coach_publish_assigned_session.sql` against the correct project and
   test both allowed and denied coach access. No live migration was executed.
4. **Full reference coverage:** screenshot-by-screenshot alignment is outstanding.
   Readiness/summary/lift reports are actual local data, not the full TrainHeroic
   analytics/engine working-max implementation. Spreadsheets cannot publish to
   mobile. Parent calendars/subscriptions, secure joins, organization settings,
   notifications, support-widget backend and folder management remain absent.
   Billing/account-site subscription flows are outside the packet's coach scope.
5. **Release access:** configure deployment/management credentials securely in
   environment settings, verify the shared-site release bundle, then deploy and
   smoke-test the production route. Never put a Supabase service key in browser
   source. Production deployment and account access have not been verified.

## Reproduce validation

```sh
cd /workspace/The-coach
npm test
for test in coach-*.smoke.mjs; do node "$test" || exit 1; done
python3 -m http.server 8091 --bind 127.0.0.1
# Separate terminal; browser contexts use isolated local demo data:
CHROMIUM_PATH=/usr/bin/chromium COACH_BROWSER_URL=http://127.0.0.1:8091/coach.html node coach-completion.smoke.mjs
bash scripts/sync-coach-apk.sh
COACH_PACKAGED_DIR=/workspace/The-coach/capacitor/www node coach-apk-shell.smoke.mjs
```

Do not report these local tests as production Supabase, deployment, compiled
native-shell, or pixel-diff certification.
