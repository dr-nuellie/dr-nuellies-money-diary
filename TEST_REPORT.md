# Unlock Root-Fix Test Report

## Scope
Only the unlock/privacy flow and service-worker cache version were changed. App presentation, chart styling and finance features were left unchanged.

## Root cause removed
The consolidated app script contained multiple independent unlock controllers. They each created or reused the same overlays, replaced `dismissPin()` and `lockAppNow()`, and ran competing startup/page-show handlers. This caused race conditions, PIN appearing before method selection, hidden content remaining black, and inconsistent method switching.

All legacy unlock controllers and their startup handlers were removed from the consolidated main script. One deterministic unlock state machine now owns the entire flow.

## Automated checks completed
- JavaScript syntax check: passed (`node --check`).
- Legacy-controller scan: passed; no `initUnlockChoice`, `enforceChooser` or `bindUnlockButtons` implementation remains.
- Exactly one authoritative unlock controller remains.
- ZIP integrity: checked after packaging.

## Browser state-machine scenarios
The exact PIN markup, early privacy guard, original PIN keypad functions and final unlock controller were executed in headless Chromium.

1. **No lock configured** — passed
   - App content is revealed.
   - No chooser or PIN overlay remains visible.

2. **PIN-only startup** — passed
   - Unlock-method chooser appears first.
   - PIN screen remains hidden until “Use PIN” is selected.
   - “Choose another unlock method” returns to the chooser.
   - Wrong PIN remains locked and shows the error.
   - Correct PIN hides every unlock overlay and reveals the app.
   - Manual/automatic lock returns to the chooser.

3. **Stale biometric setting without a credential** — passed
   - Stale flag is cleared.
   - Desktop does not remain on a black screen.

4. **PIN and biometric both configured** — passed
   - Both methods are presented.
   - PIN → chooser → biometric switching works.
   - Biometric → PIN switching works.
   - Correct PIN unlocks after switching.

## Device-only limitation
Actual Face ID/Touch ID verification still requires the installed PWA or an HTTPS session on a supported device. The controller’s selection, fallback and error paths were tested; the physical biometric sensor cannot be exercised in this environment.
