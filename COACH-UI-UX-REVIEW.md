# Sidebar and readability review

User-requested change: move the horizontal header into the side layout and
make coach controls and text larger. This intentionally departs from the old
reference chrome; it is not a claim of 1:1 screenshot parity.

Guidance used: the locally available UI Styling skill (accessibility and
responsive references), Redesign Existing Projects skill, and targeted UI/UX
Pro Max searches for pointer-target sizing and responsive navigation. Kept the
existing vanilla HTML/CSS stack, font, blue accent and training data. Did not
install React, Tailwind, shadcn, or any new UI library.

## Changes

- Replaced the 64px icon strip and horizontal black header with a 256px labeled
  desktop sidebar. Moved assistant/message/notification controls and the coach
  profile into the sidebar; unavailable integrations remain clearly disabled.
- Larger 15px navigation text, 24px icons, 48px navigation rows and 44px action
  targets. Tables/body copy are generally 14–16px; table labels are 12px.
- Enlarged roster/profile avatars, metrics, review text, table spacing, calendar
  controls, search fields and form labels. Inputs use 16px text on phones.
- Increased slide-over width to 540px on desktop while retaining full-width
  drawers on phones. Reduced the feed's competing right rail at smaller widths.
- Mobile navigation is an accessible side drawer rather than a row of tiny
  icons. Escape/outside click closes it, focus remains inside while open,
  background content is inert, and navigation returns focus to the Menu button.
- Added a skip-to-content link, current-page navigation state, visible focus
  treatment and light-on-dark toast text.
- Fixed narrow roster-filter overflow. Wide data tables scroll inside their own
  containers instead of widening the whole page.

## Verification

`coach-layout.smoke.mjs` checks eight main screen groups at 320, 375, 640, 768,
980, 981, 1024, 1280, 1440 and 1920px widths; verifies desktop sidebar placement,
44px table actions, mobile focus/Tab/Escape, navigation and landscape access.
The domain smoke suite and roster/review/nutrition/calendar/library workflows
remain regression checks. No production writes or backend integration changes
were part of this layout pass.

Updated standalone deliverable: `/workspace/shared/Hybrid-Coach-Sidebar.html`.
The earlier standalone file remains available unchanged for comparison.
