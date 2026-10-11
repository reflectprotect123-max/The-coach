# THE Hybrid — Coach side

This is **Coach**, not TRACK and not Engine.

- **GitHub:** `https://github.com/reflectprotect123-max/The-coach`
- **Android id:** `com.hybrid.coach` (same as the Windows Electron `appId`)
- **UI:** `coach.html` (locked Hybrid Coach home). `index.html` is the older workspace; Capacitor wraps **`coach.html`** as `www/index.html`.
- **Do not** merge gym loggers into this app. Totem and WHOOP ingest come **after** the APK exists.

## Tests

```bash
npm test
```

The default command runs local/domain checks. Browser workflows require Chromium
and the optional test environment variables documented in
[`RELEASE-READINESS.md`](RELEASE-READINESS.md).

## Current standalone coach

- Application source: [`coach.html`](coach.html), with its local JavaScript/CSS
  modules and isolated [`athlete-runtime/`](athlete-runtime/).
- Downloadable single-file build:
  [`releases/Hybrid-Coach-Sidebar.html`](releases/Hybrid-Coach-Sidebar.html).
  Download the raw file and open it in a browser; GitHub's file viewer does not
  run the app. Use **Demo coach (offline)** to explore local workflows.
- Full audit and known gaps: [`COACH-FULL-AUDIT.md`](COACH-FULL-AUDIT.md).
- Screen status: [`COACH-SCREEN-STATUS.md`](COACH-SCREEN-STATUS.md).
- Sidebar/layout review: [`COACH-UI-UX-REVIEW.md`](COACH-UI-UX-REVIEW.md).
- Builder boundaries: [`STRENGTH-BUILDER.md`](STRENGTH-BUILDER.md).

The build embeds local assets and the pinned Supabase browser SDK. Live cloud
features still require internet, valid accounts and the unfinished integration
work described in the audit. This is not a production-completion or pixel-parity
claim. Final builder integration is on hold.

Rebuild with `node scripts/build-standalone-coach.mjs`; this embeds local assets
but leaves the external SDK URL unless a second argument supplies the SDK file:

```bash
node scripts/build-standalone-coach.mjs releases/Hybrid-Coach-Sidebar.html /path/to/supabase-js-2.49.8.js
```

Raw uploaded packets, reference screenshots, local databases, credentials and
temporary audit fixtures are not included in this public repository. The audit
references the user's private reference packet; it is not a distributable asset
of the app.

## Android (next)

```bash
bash scripts/sync-coach-apk.sh
cd capacitor && npm install && npx cap add android && npx cap sync android
```

Do not copy TRACK WHOOP URL schemes onto this APK.

## Windows desktop

`desktop/` is the existing Electron shell. Packaged builds still load live Netlify `coach.html` until Capgo/local www is the product path.

## Pushing this tree to GitHub

Live GitHub: **https://github.com/reflectprotect123-max/The-coach** (`main`).

## Ownership and Adaptive Brain

This repository owns the coach UI, workflows, packaging and audit backlog.
Adaptive Brain is the shared decision/contract layer for the apps, not a host for
the coach dashboard. Do not maintain another coach UI copy in the Brain repo.
This separation does not finish the coach-to-athlete backend integration; see
[`COACH-FULL-AUDIT.md`](COACH-FULL-AUDIT.md).

The older local Brain dashboard mockup is preserved unchanged at
[`reference/legacy-brain-coach/index.html`](reference/legacy-brain-coach/index.html).
It is historical reference material, not the active app. `coach.html` and the
current sidebar HTML deliverable are unchanged by the repository move.
