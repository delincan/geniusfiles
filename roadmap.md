# Visual direction — first stage

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
