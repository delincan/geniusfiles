# Visual direction — first stage

# Genius AI — premium second stage

- [x] Refine welcome, transcript, composer, suggestions and conversation menu using existing tokens.
- [x] Present real pipeline milestones; hold current answer during processing, never report failed/cancelled work as 100%.
- [x] Run 42 regression tests; verify a real request, suggestions, history restoration/rename, offline state and four mobile widths plus short viewport. Preview builds, lint and formatting pass; native keyboard remains unverified.
- [ ] Verify native keyboard, rewarded quota and file operations on a physical Android device — requires a rebuilt APK and a device.

- [x] Inspect supplied references, mascot colors and existing shared styles.
- [x] Harmonize global visual tokens and refine the home screen only.
- [x] Verify small-screen rendering and existing home navigation; run regression tests (36 passed).
- [ ] Validate native system bars and touch feel on a physical Android device — requires a rebuilt APK and a device.

# Search refresh loop and assistant

- [x] Stop the search screen's background refresh loop and verify it settles.
- [x] Fix formatting so `bun run verify` passes.
- [x] Fix Genius AI "Impossible de joindre" error (hardened; phone app needs a rebuild and the site republished to confirm).

# Touch interaction

# Refresh, search and selection corrections

- [ ] Correct shared refresh gesture lifecycle without translating page content.
- [ ] Fix overlapping search rows and verify scrolling and multiple selection.
- [ ] Align selection headers with normal headers across compatible screens.
- [ ] Verify shared flows and relevant regression tests.

- [x] Diagnose focus, browser highlights and gesture interference.
- [x] Harmonize touch and keyboard behavior without changing the design.
- [x] Check shared focus rules and keyboard accessibility; five interaction tests passed and rapid taps confirmed in settings.
- [ ] Validate scrolling inertia, system gestures and all readers on a physical Android device — requires an Android device.

# Firebase Analytics full audit

- [x] Audit native initialization, lifecycle, routes, event call sites, privacy and Crashlytics.
- [x] Complete stable French screen coverage and eliminate duplicate screen views.
- [x] Apply the final event taxonomy, parameters and one-event-per-action instrumentation.
- [x] Verify SDK collection, app lifecycle and Crashlytics without artificial events.
- [x] Add behavioral and native-contract tests for screens, events, parameters and privacy.
- [x] Run all tests and `bun run verify` (36 tests passed; typecheck, lint, format and build green).
- [x] Document Firebase dimensions, explorations and the Android DebugView protocol.
- [ ] Confirm real events in Firebase DebugView on a phone — requires a rebuilt APK on a physical device.

# Google Analytics connection guidance

- [x] Explain where to find a web Measurement ID and distinguish browser tracking from access to Android Firebase reports.
- [ ] Connect for reading Analytics reports — no connection completed; requires the Read analytics insights option.

# Genius AI and Automations UI

- [x] Redesign Genius AI conversation; quota shown only when limit is reached.
- [x] Redesign Automations hierarchy; quota notice only when limit is reached.
- [x] Suggest next steps after the remix.

# File manager — premium third stage

- [x] Refine breadcrumb, file rows, grid, thumbnails and type icons with shared tokens.
- [x] Clarify multiple selection marks, count and action bar; harmonize action sheets, sort menu and confirmations.
- [x] Verify the manager in the preview (360 px: list, grid, selection, More, delete, actions, sort) and run `bun run verify`; 42 tests pass.
- [ ] Check long names, thumbnails and native file operations on a physical Android device — requires a rebuilt APK and a device.

# Step 4 — Automations, Settings and app-wide finish

- [x] Automations list: compact cards (name, objective, status, trigger, last run), switch, run, overflow actions with protected delete.
- [x] Full-page five-step editor (trigger, conditions, actions, settings, review) on its own screen.
- [x] History screen actually displayed (was hidden behind the list) and made readable; sober status indicators.
- [x] Welcoming empty states for automations and history.
- [x] Settings reorganized by category; add recent-files duration (minutes to one week).
- [x] Harmonize shared controls (switches, selectors, confirmations, progress, loading) and apply the finish to readers, tools, search, vault, trash, apps, editors, cleaner.
- [x] Run tests and `bun run verify`; check screens in the preview.
- [ ] Validate step 4 on a real Android phone (real automation runs, notifications, keyboard, system bars) — needs a new APK build.
- [x] Suggest next steps after the remix (answer once step 4 is done).

# Step 5 — Global finish and quality control

- [x] Audit every screen (dark, 360 px wide): identity, overflow, truncation, touch targets, states.
- [x] Fix inconsistencies found (components, typography, spacing, colors) without redesign.
- [x] Android feel: press feedback, page transition, sheets, back, keyboard, system bars.
- [x] States: loading, empty, no results, error, permission denied, storage/service unavailable.
- [x] Mascot use checked (welcome, empty states), not multiplied.
- [x] Quality pass: navigation, search, folders, multi-select, file ops, Genius AI, automations, settings; tests + `bun run verify`.
- [ ] Validate step 5 on a real Android phone (system bars, keyboard, real search and file operations) — needs a new APK build.

# Step 6 — Black and charcoal refinement

- [x] New palette in tokens: black #000000, sections #16171A, panels #20201E, menus #282826, borders #353639, neutrals #484848/#585857, accent #4EA2FE.
- [x] Blue reduced to actions, active tab, links, progress and active states; decorative blue tiles, halos and glows removed app-wide.
- [x] Calmer surfaces: borderless cards, no decorative shadows, opaque headers and overlays without blur, moderate radii.
- [x] Lighter titles and section headings; Organisation figures as a readable list.
- [x] Android status/splash/widget colors aligned with pure black.
- [x] `bun run verify` green; screens checked in the preview at 360 px.
- [ ] Validate on a real Android phone — needs a new APK build.

# Step 7 — Targeted cleanup (home, Genius AI, automations, settings, icons, selection)

- [x] Home header: app name + search only (no logo, no greeting), better use of the space.
- [x] Genius AI welcome: no logo/name; privacy note visibly expandable; suggestions scroll to the left.
- [x] Automations page: remove illustration, simpler and clearer layout.
- [x] Settings: clearer structure; remove Privacy & security section (privacy policy → About); remove "files stay on device" note and footer line; support email geniusfiles.contact@gmail.com; add real useful settings.
- [x] Same icon for the same action everywhere (file sheet vs reader menus).
- [x] Selection bar: remove blue check, organize, clearer "Tout"/"Intervalle" labels.
- [x] Answer the remix "next step" question.
- [ ] Check the Android permissions shortcut and vibrations on a real phone — needs a new APK build.

## Step 8 — Touch interactions (no visual identity change)

- [x] Inspect existing press, long-press, sheet, back-button and nav behaviour
- [x] Immediate, consistent pressed state on every tappable element; no hover-only behaviour
- [x] File manager: tap opens, long-press selects (no scroll conflict, never destructive)
- [x] Bottom sheets: short animation, close button, swipe-down to close, safe areas
- [x] Android Back closes keyboard → menus/sheets → previous screen
- [x] No double triggers; reduced-motion respected; light haptics only where useful
- [x] Verify main interactions across sections
- [ ] Feel-check touches, swipe-to-close and Back on a real Android phone — needs a new APK build.

## Step 9 — Motion (keep identity and touch work)

- [x] Inspect existing animations; screen transitions without flash; scroll kept
- [x] Unified sheet/dialog open + close motion, backdrop fade
- [x] File list: selection transition, smooth list updates, removal only after success, discreet op feedback
- [x] Genius AI: message appearance, thinking indicator (no fake streaming)
- [x] Skeletons only when data is slow; no flicker; reduced motion

## Step 10 — Android integration

- [x] Status/navigation bars, safe areas, edge-to-edge
- [x] Back order: keyboard → overlay → selection → previous screen/folder → exit guard
- [x] Native share / clipboard / open-with / permissions audit
- [x] Keyboard resize behaviour (Genius AI, search, automation forms)
- [x] Haptics on meaningful actions (gated)
- [x] Lifecycle: pause/resume state, no double ops, listener cleanup
- [x] Answer: suggest next steps after remix
- [ ] Real-phone check of Back, keyboard, system bars, haptics, resume — needs a new APK.
