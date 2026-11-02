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

# Firebase Analytics audit

- [x] Readable screen names, automatic Android screen tracking disabled, no duplicate screen views.
- [x] New event naming with success/failure results; one event per user action.
- [x] Crashlytics: JS errors grouped by real cause, current screen attached to crashes.
- [ ] Confirm events in Firebase DebugView on a phone — requires a rebuilt APK on a physical device.
